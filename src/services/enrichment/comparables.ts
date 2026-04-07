import type { Property, Comparable } from "@/types/property";

/**
 * Find comparable sales/rentals in the area.
 *
 * In production, this could query:
 * - Domain API partner endpoint for nearby listings
 * - CoreLogic API for historical sales data
 * - REA Group data services
 *
 * For now, returns an empty array — enriched by AI when available.
 */
export async function enrichComparables(
  property: Property
): Promise<Comparable[]> {
  const comparables: Comparable[] = [];

  // Placeholder: In production, would query listing APIs for properties
  // in the same suburb with similar characteristics
  //
  // Example query parameters:
  // - Same suburb and postcode
  // - Similar bedroom count (+/- 1)
  // - Similar property type
  // - Listed in last 90 days
  // - Within 2km radius

  return comparables;
}
