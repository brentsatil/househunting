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

function toTitleCase(s: string): string {
  return s
    .replace(/[-+]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function parseREAUrl(url: string): Partial<ExtractedProperty> {
  const data: Partial<ExtractedProperty> = {};

  // REA listing URLs:
  //   /property-house-vic-fitzroy-12345678
  //   /property-apartment+in+vic+south+yarra-12345678
  //   /rental-property-house-vic-richmond-12345678
  const pathname = new URL(url).pathname;

  // Extract listing ID (always a long numeric ID)
  const idMatch = pathname.match(/(\d{7,})/);
  if (idMatch) data.external_id = idMatch[1];

  // Main pattern: /property-{type}-{state}-{suburb}-{id}
  // Also handles: /rental-property-{type}-{state}-{suburb}-{id}
  const segments = pathname
    .replace(/^\/(?:rental-)?property-/, "")
    .replace(/\+/g, "-")
    .replace(/-\d{7,}$/, "")
    .split("-");

  if (segments.length >= 3) {
    // First segment is property type
    const typeKey = segments[0].toLowerCase();
    if (PROPERTY_TYPE_MAP[typeKey]) {
      data.property_type = PROPERTY_TYPE_MAP[typeKey];
    }

    // Find the state (2-3 letter code) — scan from position 1
    for (let i = 1; i < segments.length; i++) {
      const upper = segments[i].toUpperCase();
      if (VALID_STATES.has(upper)) {
        data.state = upper as AustralianState;
        // Everything after state and before the ID is the suburb
        const suburbParts = segments.slice(i + 1);
        if (suburbParts.length > 0) {
          data.suburb = toTitleCase(suburbParts.join(" "));
        }
        break;
      }
    }
  }

  // Detect if rental from URL
  if (pathname.includes("/rental-") || pathname.includes("/rent/")) {
    data._is_rental = true;
  }

  return data;
}

export function parseDomainUrl(url: string): Partial<ExtractedProperty> {
  const data: Partial<ExtractedProperty> = {};
  const pathname = new URL(url).pathname;

  // Domain listing URLs:
  //   /123-main-street-fitzroy-vic-3065-12345678
  //   /1-2-smith-road-south-yarra-vic-3141-12345678
  const idMatch = pathname.match(/(\d{7,})$/);
  if (idMatch) data.external_id = idMatch[1];

  // Match: /{address}-{suburb}-{state}-{postcode}-{id}
  // State is always 2-3 chars, postcode is always 4 digits
  const fullMatch = pathname.match(
    /^\/(.+?)-(\w{2,3})-(\d{4})-\d{7,}/i
  );

  if (fullMatch) {
    const addressAndSuburb = fullMatch[1];
    const stateCandidate = fullMatch[2].toUpperCase();
    const postcode = fullMatch[3];

    if (VALID_STATES.has(stateCandidate)) {
      data.state = stateCandidate as AustralianState;
      data.postcode = postcode;

      // Split address+suburb: suburb is typically the last 1-2 hyphenated words
      // before the state. We'll extract a rough suburb.
      const parts = addressAndSuburb.split("-");
      if (parts.length >= 3) {
        // Heuristic: street types indicate where address ends
        const streetTypes =
          /^(street|st|road|rd|avenue|ave|drive|dr|court|ct|place|pl|lane|ln|crescent|cres|boulevard|blvd|way|circuit|cct|parade|pde|terrace|tce|close|cl|grove|gr)$/i;

        let streetTypeIdx = -1;
        for (let i = 0; i < parts.length; i++) {
          if (streetTypes.test(parts[i])) {
            streetTypeIdx = i;
            break;
          }
        }

        if (streetTypeIdx >= 0 && streetTypeIdx < parts.length - 1) {
          data.address = toTitleCase(parts.slice(0, streetTypeIdx + 1).join(" "));
          data.suburb = toTitleCase(parts.slice(streetTypeIdx + 1).join(" "));
        } else {
          // Fallback: last 1-2 parts are suburb
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
  }

  // Detect rental vs buy from URL path
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
