import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { detectRedFlags } from "@/services/ai/red-flags";

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

    const result = await detectRedFlags(property, enrichment);

    await supabase
      .from("properties")
      .update({ ai_red_flags: result })
      .eq("id", propertyId);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Red flags detection error:", error);
    return NextResponse.json(
      { success: false, error: "Red flag detection failed" },
      { status: 500 }
    );
  }
}
