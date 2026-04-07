import { callClaudeJSON } from "./utils";
import type { Property, EnrichmentData } from "@/types/property";

export interface RedFlag {
  severity: "info" | "warning" | "critical";
  category: string;
  title: string;
  explanation: string;
}

export interface RedFlagResult {
  flags: RedFlag[];
  overall_risk: "low" | "medium" | "high";
}

export async function detectRedFlags(
  property: Property,
  enrichment?: EnrichmentData | null
): Promise<RedFlagResult> {
  const mode = property.rent_weekly ? "rental" : "purchase";

  const prompt = `You are a skeptical Australian property buyer's advocate. Analyse this ${mode} listing and flag potential issues a couple should know about before proceeding.

Property:
- Address: ${property.address}, ${property.suburb} ${property.state} ${property.postcode}
- Type: ${property.property_type || "Unknown"}
- Bedrooms: ${property.bedrooms ?? "N/A"} | Bathrooms: ${property.bathrooms ?? "N/A"} | Parking: ${property.parking ?? "N/A"}
${property.land_size_sqm ? `- Land: ${property.land_size_sqm}m²` : ""}
${property.rent_weekly ? `- Rent: $${property.rent_weekly / 100}/week` : ""}
${property.sale_price ? `- Price: $${(property.sale_price / 100).toLocaleString()}` : ""}
${property.price_guide ? `- Price Guide: ${property.price_guide}` : ""}
${property.bond ? `- Bond: $${property.bond / 100}` : ""}
${property.pet_policy ? `- Pets: ${property.pet_policy}` : ""}
${property.strata_fees_quarterly ? `- Strata: $${property.strata_fees_quarterly / 100}/quarter` : ""}
- Source: ${property.source}
- Images: ${property.images?.length ?? 0} photos
- Agent: ${property.agent_name || "Not listed"} (${property.agent_agency || "No agency"})

Description:
${property.description || "No description available."}

${enrichment?.suburb_stats ? `Suburb Stats: median rent $${enrichment.suburb_stats.median_rent_weekly}/wk, median sale $${enrichment.suburb_stats.median_sale_price ? (enrichment.suburb_stats.median_sale_price).toLocaleString() : "N/A"}` : ""}
${enrichment?.council_zoning ? `Zoning: ${JSON.stringify(enrichment.council_zoning)}` : ""}
${enrichment?.comparables ? `Comparables: ${JSON.stringify(enrichment.comparables.slice(0, 3))}` : ""}

Check for:
- Vague/evasive language hiding problems ("potential", "needs TLC", "renovator's delight")
- Price significantly below suburb median (possible scam or hidden issues)
- Missing or very few photos
- No agent details (especially on Facebook listings)
- Flood zone, bushfire prone, or heritage overlay from zoning data
- Suspiciously short lease terms or unusual bond amounts
- Missing key information that should be disclosed
- Price vs comparables mismatch

Return ONLY a JSON object:
{
  "flags": [
    { "severity": "info|warning|critical", "category": "pricing|description|location|photos|agent|zoning|terms", "title": "Short title", "explanation": "One sentence explanation" }
  ],
  "overall_risk": "low|medium|high"
}

If there are no significant flags, return {"flags": [], "overall_risk": "low"}. Be practical, not alarmist. Only flag genuine concerns.`;

  return callClaudeJSON<RedFlagResult>(prompt, 600);
}
