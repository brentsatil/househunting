import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { enrichProperty } from "@/services/enrichment";
import { summarizeProperty } from "@/services/ai/summarize";

const enrichSchema = z.object({
  propertyId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { propertyId } = enrichSchema.parse(body);

    const supabase = await createClient();

    // Fetch the property
    const { data: property, error } = await supabase
      .from("properties")
      .select("*")
      .eq("id", propertyId)
      .single();

    if (error || !property) {
      return NextResponse.json(
        { success: false, error: "Property not found" },
        { status: 404 }
      );
    }

    // Run enrichment pipeline
    const enrichmentResult = await enrichProperty(property);

    // Store enrichment data
    await supabase.from("enrichment_data").upsert(
      {
        property_id: propertyId,
        suburb_stats: enrichmentResult.suburb_stats,
        council_zoning: enrichmentResult.council_zoning,
        comparables: enrichmentResult.comparables,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "property_id" }
    );

    // Generate AI summary if API key is available
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const summary = await summarizeProperty(property, {
          id: "",
          property_id: propertyId,
          suburb_stats: enrichmentResult.suburb_stats as Record<string, unknown> | null,
          council_zoning: enrichmentResult.council_zoning as Record<string, unknown> | null,
          comparables: enrichmentResult.comparables as Array<{
            address: string;
            price: number;
            bedrooms: number;
            bathrooms: number;
            property_type: string;
            distance_km: number;
          }> | null,
          fetched_at: new Date().toISOString(),
        });

        await supabase
          .from("properties")
          .update({ ai_summary: summary })
          .eq("id", propertyId);
      } catch (aiError) {
        console.error("AI summarization failed:", aiError);
        // Non-fatal — enrichment data was still saved
      }
    }

    return NextResponse.json({
      success: true,
      data: enrichmentResult,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Enrichment error:", error);
    return NextResponse.json(
      { success: false, error: "Enrichment failed" },
      { status: 500 }
    );
  }
}
