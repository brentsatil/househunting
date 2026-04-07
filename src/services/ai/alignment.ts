import { callClaudeJSON } from "./utils";
import type { Property, PropertyInteraction, Comment } from "@/types/property";

export interface AlignmentResult {
  together_score: number;
  agreements: string[];
  disagreements: string[];
  compromise_suggestions: string[];
  verdict: string;
}

export async function analyzePartnerAlignment(
  property: Property,
  interactions: PropertyInteraction[],
  comments: Comment[]
): Promise<AlignmentResult> {
  const user1 = interactions[0];
  const user2 = interactions[1];

  const mode = property.rent_weekly ? "rental" : "purchase";

  const recentComments = comments
    .slice(-10)
    .map((c) => c.content)
    .join("\n- ");

  const prompt = `You are a couples' property advisor helping two partners evaluate a ${mode} property together. Analyse their individual feedback and produce an alignment analysis.

Property: ${property.address}, ${property.suburb} ${property.state}
Type: ${property.property_type || "Unknown"} | ${property.bedrooms ?? "?"} bed | ${property.bathrooms ?? "?"} bath
${property.rent_weekly ? `Rent: $${property.rent_weekly / 100}/week` : ""}
${property.sale_price ? `Price: $${(property.sale_price / 100).toLocaleString()}` : ""}

Partner 1:
- Rating: ${user1?.rating ?? "Not rated"}/5
- Pros: ${user1?.pros || "None listed"}
- Cons: ${user1?.cons || "None listed"}
- Notes: ${user1?.notes || "None"}

Partner 2:
- Rating: ${user2?.rating ?? "Not rated"}/5
- Pros: ${user2?.pros || "None listed"}
- Cons: ${user2?.cons || "None listed"}
- Notes: ${user2?.notes || "None"}

${recentComments ? `Recent discussion:\n- ${recentComments}` : ""}

Return ONLY a JSON object:
{
  "together_score": <1-10 integer, where 10 = perfectly aligned>,
  "agreements": ["Things both partners seem to agree on (max 4)"],
  "disagreements": ["Where they differ (max 4)"],
  "compromise_suggestions": ["Practical suggestions to resolve differences (max 3)"],
  "verdict": "One sentence summary of alignment for this property"
}

Be warm and constructive, not clinical. Use natural Australian English.`;

  return callClaudeJSON<AlignmentResult>(prompt, 600);
}
