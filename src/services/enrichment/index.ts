import type { Property, SuburbStats, CouncilZoning, Comparable } from "@/types/property";
import { enrichSuburb } from "./suburb";
import { enrichCouncil } from "./council";
import { enrichComparables } from "./comparables";

export interface EnrichmentResult {
  suburb_stats: SuburbStats | null;
  council_zoning: CouncilZoning | null;
  comparables: Comparable[] | null;
}

export async function enrichProperty(property: Property): Promise<EnrichmentResult> {
  // Run enrichment tasks in parallel
  const [suburbStats, councilZoning, comparables] = await Promise.allSettled([
    enrichSuburb(property.suburb, property.state, property.postcode),
    enrichCouncil(property.suburb, property.state, property.lat, property.lng),
    enrichComparables(property),
  ]);

  return {
    suburb_stats: suburbStats.status === "fulfilled" ? suburbStats.value : null,
    council_zoning: councilZoning.status === "fulfilled" ? councilZoning.value : null,
    comparables: comparables.status === "fulfilled" ? comparables.value : null,
  };
}
