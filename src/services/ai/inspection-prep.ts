import { callClaudeJSON } from "./utils";
import type { Property, EnrichmentData, PropertyInteraction, Comment } from "@/types/property";

export interface InspectionPrepResult {
  questions_for_agent: string[];
  things_to_check: string[];
  red_flags_to_watch: string[];
  bring_items: string[];
}

export async function generateInspectionPrep(
  property: Property,
  enrichment?: EnrichmentData | null,
  interactions?: PropertyInteraction[],
  comments?: Comment[]
): Promise<InspectionPrepResult> {
  const mode = property.rent_weekly ? "rental" : "purchase";
  const type = property.property_type || "property";

  const concerns = [
    ...(interactions || []).flatMap((i) => [i.pros, i.cons, i.notes].filter(Boolean)),
    ...(comments || []).slice(-5).map((c) => c.content),
  ].join("; ");

  const prompt = `You are an Australian property inspection expert. Generate a tailored inspection checklist for a couple visiting this ${mode} ${type}.

Property: ${property.address}, ${property.suburb} ${property.state} ${property.postcode}
Type: ${type} | ${property.bedrooms ?? "?"} bed | ${property.bathrooms ?? "?"} bath | ${property.parking ?? "?"} car
${property.land_size_sqm ? `Land: ${property.land_size_sqm}m²` : ""}
${property.rent_weekly ? `Rent: $${property.rent_weekly / 100}/week` : ""}
${property.sale_price ? `Price: $${(property.sale_price / 100).toLocaleString()}` : ""}
${property.strata_fees_quarterly ? `Strata: $${property.strata_fees_quarterly / 100}/quarter` : ""}
${property.pet_policy ? `Pets: ${property.pet_policy}` : ""}
${property.available_date ? `Available: ${property.available_date}` : ""}

${enrichment?.council_zoning ? `Zoning: ${enrichment.council_zoning.zone_description || enrichment.council_zoning.zone_code || "Unknown"}${enrichment.council_zoning.flood_zone ? " | FLOOD ZONE" : ""}${enrichment.council_zoning.bushfire_prone ? " | BUSHFIRE PRONE" : ""}${enrichment.council_zoning.heritage_overlay ? " | HERITAGE OVERLAY" : ""}` : ""}
${enrichment?.suburb_stats ? `Walk score: ${enrichment.suburb_stats.walk_score ?? "N/A"}, Transit: ${enrichment.suburb_stats.transit_score ?? "N/A"}` : ""}

${concerns ? `Partner concerns/notes: ${concerns}` : ""}

Tailor your checklist to this specific property type and situation. For example:
- Apartments: check strata, common areas, noise, building condition
- Houses: check structural, roof, drainage, fencing, pest signs
- Rentals: check condition report items, maintenance responsiveness
- If flood/bushfire zone: specific checks for those risks

Return ONLY a JSON object:
{
  "questions_for_agent": ["5-8 specific questions to ask the agent at this inspection"],
  "things_to_check": ["6-10 specific things to physically inspect"],
  "red_flags_to_watch": ["3-5 warning signs to look for"],
  "bring_items": ["3-5 items to bring to the inspection"]
}

Be specific to THIS property. Avoid generic advice.`;

  return callClaudeJSON<InspectionPrepResult>(prompt, 800);
}
