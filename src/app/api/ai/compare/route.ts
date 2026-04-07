import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { compareProperties } from "@/services/ai/compare";
import type { SearchMode } from "@/types/property";

const schema = z.object({
  propertyIds: z.array(z.string().uuid()).min(2).max(3),
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
    const { propertyIds, mode } = schema.parse(body);

    const supabase = await createClient();

    const items = await Promise.all(
      propertyIds.map(async (id) => {
        const { data: property } = await supabase
          .from("properties")
          .select("*")
          .eq("id", id)
          .single();

        const { data: interactions } = await supabase
          .from("property_interactions")
          .select("*")
          .eq("property_id", id);

        const { data: enrichment } = await supabase
          .from("enrichment_data")
          .select("*")
          .eq("property_id", id)
          .maybeSingle();

        return {
          property: property!,
          interactions: interactions || [],
          enrichment,
        };
      })
    );

    if (items.some((i) => !i.property)) {
      return NextResponse.json(
        { success: false, error: "One or more properties not found" },
        { status: 404 }
      );
    }

    const result = await compareProperties(items, mode as SearchMode);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Comparison error:", error);
    return NextResponse.json(
      { success: false, error: "Property comparison failed" },
      { status: 500 }
    );
  }
}
