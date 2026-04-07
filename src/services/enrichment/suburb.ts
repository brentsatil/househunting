import type { SuburbStats } from "@/types/property";

/**
 * Enriches suburb data using available APIs.
 * Uses Google Maps Places API when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set.
 * Falls back to basic data otherwise.
 */
export async function enrichSuburb(
  suburb: string,
  state: string,
  postcode: string
): Promise<SuburbStats> {
  const stats: SuburbStats = {};

  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (googleApiKey) {
    // Use Google Places API to find nearby amenities
    const query = encodeURIComponent(`${suburb} ${state} ${postcode} Australia`);

    try {
      // Find nearby schools
      const schoolsResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=schools+near+${query}&key=${googleApiKey}`
      );
      if (schoolsResponse.ok) {
        const schoolsData = await schoolsResponse.json();
        stats.nearby_schools = (schoolsData.results || []).slice(0, 5).map(
          (place: Record<string, unknown>) => ({
            name: place.name as string,
            type: "school",
            distance_km: 0, // Would need geocoding to calculate
          })
        );
      }

      // Find nearby transport
      const transportResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=train+station+OR+bus+stop+near+${query}&key=${googleApiKey}`
      );
      if (transportResponse.ok) {
        const transportData = await transportResponse.json();
        stats.nearby_transport = (transportData.results || []).slice(0, 5).map(
          (place: Record<string, unknown>) => ({
            name: place.name as string,
            type: (place.types as string[] || []).includes("train_station")
              ? "train"
              : "bus",
            distance_km: 0,
          })
        );
      }
    } catch (error) {
      console.error("Google Places API error:", error);
    }
  }

  return stats;
}
