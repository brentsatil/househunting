import type { CouncilZoning } from "@/types/property";

/**
 * Council zoning data enrichment.
 *
 * In production, this would query state-specific planning portals:
 * - NSW: planning.nsw.gov.au
 * - VIC: land.vic.gov.au
 * - QLD: planning.dilgp.qld.gov.au
 *
 * For now, returns a placeholder structure that can be filled by
 * AI enrichment or manual entry.
 */
export async function enrichCouncil(
  suburb: string,
  state: string,
  lat: number | null,
  lng: number | null
): Promise<CouncilZoning> {
  const zoning: CouncilZoning = {
    local_government_area: `${suburb} Council`,
  };

  // State-specific data sources would be queried here
  // Each state in Australia has different planning portals and APIs
  //
  // Example endpoints (would need registration/API keys):
  // NSW: https://api.planningportal.nsw.gov.au/
  // VIC: https://mapshare.vic.gov.au/
  // QLD: https://planning.dilgp.qld.gov.au/

  // For now, return basic structure
  // The AI summarization step can infer some zoning info from the listing description
  return zoning;
}
