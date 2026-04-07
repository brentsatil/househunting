/**
 * Travel time estimation between property inspections.
 *
 * Uses the Haversine formula to calculate straight-line distance,
 * then applies a city driving factor to estimate travel time.
 * This avoids requiring a Google Maps API call for every pair.
 */

/** Haversine distance in km */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface TravelEstimate {
  distanceKm: number;
  /** Estimated driving time in minutes */
  drivingMinutes: number;
  /** Whether this transit is tight (< 15 min buffer) */
  isTight: boolean;
  /** Whether this transit is impossible given the inspection times */
  isImpossible: boolean;
}

/**
 * Estimate travel time between two locations.
 *
 * Uses straight-line distance × 1.4 (road winding factor) at
 * 35 km/h average city driving speed. Adds 5 min for parking.
 */
export function estimateTravel(
  lat1: number | null,
  lng1: number | null,
  lat2: number | null,
  lng2: number | null,
  /** Minutes available between inspections */
  availableMinutes?: number
): TravelEstimate | null {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) {
    return null;
  }

  const straightLineKm = haversineKm(lat1, lng1, lat2, lng2);
  const roadKm = straightLineKm * 1.4;
  // 35 km/h average city speed + 5 min parking
  const drivingMinutes = Math.round((roadKm / 35) * 60) + 5;

  return {
    distanceKm: Math.round(roadKm * 10) / 10,
    drivingMinutes,
    isTight:
      availableMinutes !== undefined &&
      availableMinutes - drivingMinutes < 15,
    isImpossible:
      availableMinutes !== undefined && drivingMinutes > availableMinutes,
  };
}

/**
 * Estimate travel between two suburbs when coordinates aren't available.
 * Returns null if suburbs are the same (walkable), or a rough estimate.
 */
export function estimateTravelBySuburb(
  suburb1: string,
  suburb2: string
): TravelEstimate | null {
  if (suburb1.toLowerCase() === suburb2.toLowerCase()) {
    // Same suburb — assume ~5 min drive
    return {
      distanceKm: 1,
      drivingMinutes: 5,
      isTight: false,
      isImpossible: false,
    };
  }
  // Different suburbs — can't estimate without coordinates
  return null;
}
