import { callClaudeJSON } from "./utils";
import type { Property, PropertyInteraction, EnrichmentData, SearchMode } from "@/types/property";

export interface ComparisonDimension {
  name: string;
  ratings: Record<string, { score: number; note: string }>;
}

export interface CompareResult {
  dimensions: ComparisonDimension[];
  per_property: Record<string, { strengths: string[]; weaknesses: string[] }>;
  recommendation: string;
  key_tradeoff: string;
}

interface PropertyForComparison {
  property: Property;
  interactions: PropertyInteraction[];
  enrichment?: EnrichmentData | null;
}

export async function compareProperties(
  items: PropertyForComparison[],
  mode: SearchMode
): Promise<CompareResult> {
  const propertyDescriptions = items
    .map((item, i) => {
      const p = item.property;
      const user1 = item.interactions[0];
      const user2 = item.interactions[1];
      return `Property ${i + 1} (ID: ${p.id}):
- Address: ${p.address}, ${p.suburb} ${p.state}
- Type: ${p.property_type || "Unknown"} | ${p.bedrooms ?? "?"} bed | ${p.bathrooms ?? "?"} bath | ${p.parking ?? "?"} car
${p.land_size_sqm ? `- Land: ${p.land_size_sqm}m²` : ""}
${mode === "rent" ? `- Rent: ${p.rent_weekly ? `$${p.rent_weekly / 100}/wk` : "TBA"}` : `- Price: ${p.sale_price ? `$${(p.sale_price / 100).toLocaleString()}` : p.price_guide || "TBA"}`}
${p.strata_fees_quarterly ? `- Strata: $${p.strata_fees_quarterly / 100}/qtr` : ""}
- Partner 1 rating: ${user1?.rating ?? "unrated"}/5${user1?.pros ? ` (pros: ${user1.pros})` : ""}${user1?.cons ? ` (cons: ${user1.cons})` : ""}
- Partner 2 rating: ${user2?.rating ?? "unrated"}/5${user2?.pros ? ` (pros: ${user2.pros})` : ""}${user2?.cons ? ` (cons: ${user2.cons})` : ""}
${item.enrichment?.suburb_stats ? `- Walk score: ${item.enrichment.suburb_stats.walk_score ?? "N/A"}, Transit: ${item.enrichment.suburb_stats.transit_score ?? "N/A"}` : ""}
${item.enrichment?.council_zoning?.flood_zone ? "- WARNING: Flood zone" : ""}`;
    })
    .join("\n\n");

  const prompt = `You are helping a couple decide between ${items.length} ${mode === "rent" ? "rental" : ""} properties in Australia. Compare them across key dimensions.

${propertyDescriptions}

Return ONLY a JSON object with property IDs as keys where needed:
{
  "dimensions": [
    { "name": "Value for Money", "ratings": { "<property_id>": { "score": 1-10, "note": "brief note" } } },
    { "name": "Location & Commute", "ratings": { ... } },
    { "name": "Space & Layout", "ratings": { ... } },
    { "name": "Condition & Risk", "ratings": { ... } },
    { "name": "Partner Alignment", "ratings": { ... } },
    { "name": "Lifestyle Fit", "ratings": { ... } }
  ],
  "per_property": {
    "<property_id>": { "strengths": ["max 3"], "weaknesses": ["max 3"] }
  },
  "recommendation": "One paragraph recommendation for the couple",
  "key_tradeoff": "The main tradeoff they need to consider in one sentence"
}

Use the actual property IDs (${items.map((i) => i.property.id).join(", ")}) as keys. Be balanced and practical.`;

  return callClaudeJSON<CompareResult>(prompt, 1200);
}
