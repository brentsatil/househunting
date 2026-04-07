import Anthropic from "@anthropic-ai/sdk";
import type { Property, EnrichmentData } from "@/types/property";

const anthropic = new Anthropic();

export async function summarizeProperty(
  property: Property,
  enrichment?: EnrichmentData | null
): Promise<string> {
  const mode = property.rent_weekly ? "rental" : "purchase";

  const prompt = `You are an Australian property analyst. Summarize this ${mode} property listing in 2-3 concise paragraphs for a couple evaluating it together. Focus on key decision factors: value for money, location pros/cons, and anything noteworthy.

Property Details:
- Address: ${property.address}, ${property.suburb} ${property.state} ${property.postcode}
- Type: ${property.property_type || "Unknown"}
- Bedrooms: ${property.bedrooms ?? "N/A"} | Bathrooms: ${property.bathrooms ?? "N/A"} | Parking: ${property.parking ?? "N/A"}
${property.land_size_sqm ? `- Land: ${property.land_size_sqm}m²` : ""}
${property.building_size_sqm ? `- Building: ${property.building_size_sqm}m²` : ""}
${property.rent_weekly ? `- Rent: $${property.rent_weekly / 100}/week` : ""}
${property.sale_price ? `- Price: $${(property.sale_price / 100).toLocaleString()}` : ""}
${property.price_guide ? `- Price Guide: ${property.price_guide}` : ""}
${property.bond ? `- Bond: $${property.bond / 100}` : ""}
${property.lease_length ? `- Lease: ${property.lease_length}` : ""}
${property.pet_policy ? `- Pets: ${property.pet_policy}` : ""}
${property.strata_fees_quarterly ? `- Strata: $${property.strata_fees_quarterly / 100}/quarter` : ""}
${property.auction_date ? `- Auction: ${property.auction_date}` : ""}

Description:
${property.description || "No description available."}

${enrichment?.suburb_stats ? `Suburb Data: ${JSON.stringify(enrichment.suburb_stats)}` : ""}
${enrichment?.council_zoning ? `Zoning: ${JSON.stringify(enrichment.council_zoning)}` : ""}

Keep the summary practical and useful for a couple making a joint decision. Use Australian property terminology.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  return textBlock?.text || "Unable to generate summary.";
}

export async function naturalLanguageSearch(
  query: string,
  mode: "rent" | "buy"
): Promise<{
  suburb?: string;
  minBedrooms?: number;
  maxPrice?: number;
  propertyType?: string;
  features?: string[];
}> {
  const prompt = `Parse this Australian property search query into structured filters. The user is ${mode === "rent" ? "renting" : "buying"}.

Query: "${query}"

Return a JSON object with these optional fields:
- suburb (string): suburb name if mentioned
- minBedrooms (number): minimum bedrooms
- maxPrice (number): maximum price ${mode === "rent" ? "per week in dollars" : "in dollars"}
- propertyType (string): house, apartment, townhouse, etc.
- features (string[]): other requirements like "pet friendly", "near train", "garage"

Only include fields explicitly mentioned or clearly implied. Return valid JSON only.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  try {
    return JSON.parse(textBlock?.text || "{}");
  } catch {
    return {};
  }
}
