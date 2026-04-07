import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateSearchDigest } from "@/services/ai/digest";
import type { SearchMode } from "@/types/property";

const schema = z.object({
  partnershipId: z.string().uuid(),
  mode: z.enum(["rent", "buy"]),
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
    const { partnershipId, mode } = schema.parse(body);

    const supabase = await createClient();

    const { data: properties } = await supabase
      .from("properties")
      .select("*")
      .eq("partnership_id", partnershipId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!properties || properties.length < 3) {
      return NextResponse.json(
        { success: false, error: "Need at least 3 properties for a digest" },
        { status: 400 }
      );
    }

    const { data: allInteractionsRaw } = await supabase
      .from("property_interactions")
      .select("*")
      .in(
        "property_id",
        properties.map((p) => p.id)
      );

    const interactionsList = allInteractionsRaw || [];
    const allInteractions: Record<string, typeof interactionsList> = {};
    for (const interaction of interactionsList) {
      if (!allInteractions[interaction.property_id]) {
        allInteractions[interaction.property_id] = [];
      }
      allInteractions[interaction.property_id]!.push(interaction);
    }

    const { data: inspections } = await supabase
      .from("inspections")
      .select("*")
      .in(
        "property_id",
        properties.map((p) => p.id)
      )
      .order("datetime", { ascending: true });

    const result = await generateSearchDigest(
      properties,
      allInteractions,
      inspections || [],
      mode as SearchMode
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Digest error:", error);
    return NextResponse.json(
      { success: false, error: "Digest generation failed" },
      { status: 500 }
    );
  }
}
