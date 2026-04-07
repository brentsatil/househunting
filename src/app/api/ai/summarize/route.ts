import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { summarizeProperty } from "@/services/ai/summarize";

const summarizeSchema = z.object({
  propertyId: z.string().uuid(),
});

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { success: false, error: "Anthropic API key not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { propertyId } = summarizeSchema.parse(body);

    const supabase = await createClient();

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

    // Fetch enrichment data if available
    const { data: enrichment } = await supabase
      .from("enrichment_data")
      .select("*")
      .eq("property_id", propertyId)
      .maybeSingle();

    const summary = await summarizeProperty(property, enrichment);

    // Store the summary
    await supabase
      .from("properties")
      .update({ ai_summary: summary })
      .eq("id", propertyId);

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Summarization error:", error);
    return NextResponse.json(
      { success: false, error: "Summarization failed" },
      { status: 500 }
    );
  }
}
