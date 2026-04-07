import { callClaudeJSON } from "./utils";
import type { Property, PropertyInteraction, Inspection, SearchMode } from "@/types/property";

export interface DigestResult {
  summary: string;
  patterns: string[];
  stale_properties: Array<{ id: string; address: string; suggestion: string }>;
  upcoming_actions: string[];
  search_insight: string;
}

export async function generateSearchDigest(
  properties: Property[],
  allInteractions: Record<string, PropertyInteraction[]>,
  inspections: Inspection[],
  mode: SearchMode
): Promise<DigestResult> {
  const now = new Date();

  const propertyList = properties
    .map((p) => {
      const ints = allInteractions[p.id] || [];
      const r1 = ints[0]?.rating;
      const r2 = ints[1]?.rating;
      const daysSinceAdded = Math.floor(
        (now.getTime() - new Date(p.created_at).getTime()) / 86400000
      );
      return `- ${p.address}, ${p.suburb} (${p.property_type || "?"}, ${p.bedrooms ?? "?"}bed) | Status: ${p.status} | Added ${daysSinceAdded}d ago | Ratings: ${r1 ?? "-"}/${r2 ?? "-"} | ${mode === "rent" ? `$${p.rent_weekly ? p.rent_weekly / 100 : "?"}pw` : `$${p.sale_price ? (p.sale_price / 100).toLocaleString() : "?"}`}`;
    })
    .join("\n");

  const upcomingInspections = inspections
    .filter((i) => new Date(i.datetime) >= now)
    .slice(0, 5)
    .map(
      (i) =>
        `- ${new Date(i.datetime).toLocaleDateString("en-AU")} at ${new Date(i.datetime).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })} (${i.attendees.length} attending)`
    )
    .join("\n");

  const prompt = `You are a property search coach for an Australian couple. Analyse their ${mode === "rent" ? "rental" : "buying"} search portfolio and provide a weekly digest.

${properties.length} properties saved:
${propertyList}

${upcomingInspections ? `Upcoming inspections:\n${upcomingInspections}` : "No upcoming inspections."}

Return ONLY a JSON object:
{
  "summary": "2-3 sentence overview of their search progress and momentum",
  "patterns": ["2-4 patterns you notice in their preferences, e.g. suburb trends, property types, price ranges"],
  "stale_properties": [{"id": "<property_id>", "address": "address", "suggestion": "what to do about it"}],
  "upcoming_actions": ["3-5 suggested next steps based on their portfolio"],
  "search_insight": "One insightful observation about their search strategy"
}

For stale_properties, flag any that have been at "interested" status for 14+ days without an inspection booked, or "inspected" for 7+ days without a decision. Use the actual property IDs (available from the listing above).

Be encouraging and practical. Use Australian property terminology.`;

  return callClaudeJSON<DigestResult>(prompt, 800);
}
