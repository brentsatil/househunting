import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateInspectionPrep } from "@/services/ai/inspection-prep";

const schema = z.object({
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
    const { propertyId } = schema.parse(body);

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

    const { data: enrichment } = await supabase
      .from("enrichment_data")
      .select("*")
      .eq("property_id", propertyId)
      .maybeSingle();

    const { data: interactions } = await supabase
      .from("property_interactions")
      .select("*")
      .eq("property_id", propertyId);

    const { data: comments } = await supabase
      .from("comments")
      .select("*")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: true });

    const result = await generateInspectionPrep(
      property,
      enrichment,
      interactions || [],
      comments || []
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Inspection prep error:", error);
    return NextResponse.json(
      { success: false, error: "Inspection prep generation failed" },
      { status: 500 }
    );
  }
}
