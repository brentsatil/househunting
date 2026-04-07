import type { ExtractedProperty, AustralianState, PropertyType } from "@/types/property";

/**
 * Extract structured data directly from URL patterns — zero network cost.
 * REA and Domain encode property type, state, suburb, and listing ID in their URLs.
 */

const PROPERTY_TYPE_MAP: Record<string, PropertyType> = {
  house: "house",
  apartment: "apartment",
  townhouse: "townhouse",
  villa: "villa",
  unit: "unit",
  studio: "studio",
  duplex: "duplex",
  land: "land",
  acreage: "land",
  rural: "land",
  "semi-detached": "house",
  terrace: "house",
};

const VALID_STATES = new Set(["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"]);

const STREET_TYPES =
  /^(street|st|road|rd|avenue|ave|drive|dr|court|ct|place|pl|lane|ln|crescent|cres|boulevard|blvd|way|circuit|cct|parade|pde|terrace|tce|close|cl|grove|gr|highway|hwy)$/i;

function toTitleCase(s: string): string {
  return s
    .replace(/[-+]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/**
 * Parse REA URLs. Handles multiple formats:
 *
 * Format 1 (search/browse):
 *   /property-house-vic-fitzroy-12345678
 *   /property-apartment+in+vic+south+yarra-12345678
 *   /rental-property-house-vic-richmond-12345678
 *
 * Format 2 (canonical listing page):
 *   /property/42-smith-street-fitzroy-vic-3065
 *   /property/1-2-jones-road-south-yarra-vic-3141
 *
 * Format 3 (rental listing):
 *   /rent/property/42-smith-street-fitzroy-vic-3065/12345678
 *   /rent/42-smith-st-richmond-vic-3121-12345678
 */
export function parseREAUrl(url: string): Partial<ExtractedProperty> {
  const data: Partial<ExtractedProperty> = {};
  const parsed = new URL(url);
  const pathname = decodeURIComponent(parsed.pathname);

  // Extract listing ID (long numeric string anywhere in URL)
  const idMatch = pathname.match(/(\d{7,})/);
  if (idMatch) data.external_id = idMatch[1];

  // Detect rental
  if (
    pathname.includes("/rental") ||
    pathname.includes("/rent/") ||
    pathname.startsWith("/rent")
  ) {
    data._is_rental = true;
  }

  // Try Format 2/3 first (address-based): contains state + postcode pattern
  // e.g., /property/42-smith-street-fitzroy-vic-3065
  // e.g., /rent/42-smith-st-richmond-vic-3121-12345678
  const addressMatch = pathname.match(
    /\/(?:property\/|rent\/(?:property\/)?)?(.+?)-(nsw|vic|qld|wa|sa|tas|act|nt)-(\d{4})(?:-\d+)?$/i
  );

  if (addressMatch) {
    const addressAndSuburb = addressMatch[1];
    data.state = addressMatch[2].toUpperCase() as AustralianState;
    data.postcode = addressMatch[3];

    // Split into address + suburb using street type as boundary
    const parts = addressAndSuburb.replace(/\+/g, "-").split("-");

    // Find the last street type — everything before it is address, after is suburb
    let streetTypeIdx = -1;
    for (let i = parts.length - 1; i >= 0; i--) {
      if (STREET_TYPES.test(parts[i])) {
        streetTypeIdx = i;
        break;
      }
    }

    if (streetTypeIdx >= 0 && streetTypeIdx < parts.length - 1) {
      data.address = toTitleCase(parts.slice(0, streetTypeIdx + 1).join(" "));
      data.suburb = toTitleCase(parts.slice(streetTypeIdx + 1).join(" "));
    } else if (parts.length >= 2) {
      // No street type found — last 1-2 parts are likely suburb
      // Heuristic: if there are enough parts, last 2 are suburb (e.g., "south yarra")
      const suburbWordCount =
        parts.length > 4 ? 2 : parts.length > 2 ? 1 : 0;
      if (suburbWordCount > 0) {
        data.suburb = toTitleCase(
          parts.slice(-suburbWordCount).join(" ")
        );
        data.address = toTitleCase(
          parts.slice(0, -suburbWordCount).join(" ")
        );
      }
    }

    // Try to detect property type from URL path
    const pathBeforeAddress = pathname.split(addressAndSuburb)[0] || "";
    for (const [key, type] of Object.entries(PROPERTY_TYPE_MAP)) {
      if (pathBeforeAddress.includes(key)) {
        data.property_type = type;
        break;
      }
    }

    return data;
  }

  // Try Format 1 (search/browse): /property-{type}-{state}-{suburb}-{id}
  const browseClean = pathname
    .replace(/^\/(?:rental-)?property-/, "")
    .replace(/^rent\/property-/, "")
    .replace(/\+/g, "-")
    .replace(/-\d{7,}$/, "");

  const segments = browseClean.split("-").filter(Boolean);

  if (segments.length >= 2) {
    // First segment might be property type
    const typeKey = segments[0].toLowerCase();
    const hasType = !!PROPERTY_TYPE_MAP[typeKey];
    if (hasType) {
      data.property_type = PROPERTY_TYPE_MAP[typeKey];
    }

    // Find the state code
    const startIdx = hasType ? 1 : 0;
    for (let i = startIdx; i < segments.length; i++) {
      const upper = segments[i].toUpperCase();
      if (VALID_STATES.has(upper)) {
        data.state = upper as AustralianState;
        const suburbParts = segments.slice(i + 1);
        if (suburbParts.length > 0) {
          data.suburb = toTitleCase(suburbParts.join(" "));
        }
        break;
      }
    }
  }

  return data;
}

/**
 * Parse Domain URLs.
 * Format: /123-main-street-fitzroy-vic-3065-12345678
 * Also:   /rent/123-main-street-fitzroy-vic-3065-12345678
 */
export function parseDomainUrl(url: string): Partial<ExtractedProperty> {
  const data: Partial<ExtractedProperty> = {};
  const pathname = decodeURIComponent(new URL(url).pathname);

  // Extract listing ID
  const idMatch = pathname.match(/(\d{7,})$/);
  if (idMatch) data.external_id = idMatch[1];

  // Match state + postcode pattern
  const fullMatch = pathname.match(
    /\/(?:rent\/|buy\/)?(.+?)-(nsw|vic|qld|wa|sa|tas|act|nt)-(\d{4})(?:-\d+)?$/i
  );

  if (fullMatch) {
    const addressAndSuburb = fullMatch[1];
    data.state = fullMatch[2].toUpperCase() as AustralianState;
    data.postcode = fullMatch[3];

    const parts = addressAndSuburb.split("-");
    if (parts.length >= 3) {
      let streetTypeIdx = -1;
      for (let i = parts.length - 1; i >= 0; i--) {
        if (STREET_TYPES.test(parts[i])) {
          streetTypeIdx = i;
          break;
        }
      }

      if (streetTypeIdx >= 0 && streetTypeIdx < parts.length - 1) {
        data.address = toTitleCase(
          parts.slice(0, streetTypeIdx + 1).join(" ")
        );
        data.suburb = toTitleCase(
          parts.slice(streetTypeIdx + 1).join(" ")
        );
      } else {
        const suburbWordCount = parts.length > 4 ? 2 : 1;
        data.suburb = toTitleCase(
          parts.slice(-suburbWordCount).join(" ")
        );
        data.address = toTitleCase(
          parts.slice(0, -suburbWordCount).join(" ")
        );
      }
    }
  }

  // Detect rental
  if (pathname.includes("/rent/") || pathname.includes("/rental")) {
    data._is_rental = true;
  }

  return data;
}

export function parseFacebookUrl(url: string): Partial<ExtractedProperty> {
  const data: Partial<ExtractedProperty> = {};
  const idMatch = url.match(/\/(?:item|listing)\/(\d+)/);
  if (idMatch) data.external_id = idMatch[1];
  return data;
}

// Augment ExtractedProperty type locally with internal hints
declare module "@/types/property" {
  interface ExtractedProperty {
    _is_rental?: boolean;
  }
}
