import * as cheerio from "cheerio";
import type { ExtractedProperty, AustralianState } from "@/types/property";

/**
 * REA-specific HTML parsing.
 * Extracts data from realestate.com.au HTML using (in priority order):
 * 1. window.ArgonautExchange JSON cache (REA's primary data source)
 * 2. __NEXT_DATA__ embedded JSON (legacy, may still appear on some pages)
 * 3. CSS selectors for visible page elements (fallback)
 *
 * JSON-LD and meta tags are handled by the shared extractStructuredData().
 * This function adds REA-specific parsing on top.
 */
export function parseREAHtml(
  html: string,
  url: string,
  base: ExtractedProperty
): ExtractedProperty {
  const $ = cheerio.load(html);
  const data = { ...base };

  // === Strategy 1: Parse window.ArgonautExchange ===
  // REA's primary data delivery mechanism — a JSON cache embedded in a script tag
  $("script").each((_, el) => {
    const text = $(el).text();
    if (text.includes("ArgonautExchange")) {
      try {
        const jsonMatch = text.match(
          /window\.ArgonautExchange\s*=\s*(\{[\s\S]*?\});?\s*(?:<\/script>|$)/
        );
        if (jsonMatch) {
          const json = JSON.parse(jsonMatch[1]);
          parseArgonautExchange(json, data);
        }
      } catch {
        // ArgonautExchange parse failed — try other strategies
      }
    }
  });

  // === Strategy 2: Parse __NEXT_DATA__ or embedded listing JSON ===
  $("script").each((_, el) => {
    const text = $(el).text();

    // Check for __NEXT_DATA__ script tag (Next.js SSR data)
    if ($(el).attr("id") === "__NEXT_DATA__") {
      try {
        const json = JSON.parse(text);
        parseREANextData(json, data);
      } catch {
        // Skip
      }
      return;
    }

    // Check for inline listing data (older REA pages)
    if (text.includes("listingDetails") || text.includes("__NEXT_DATA__")) {
      try {
        const jsonMatch = text.match(/\{[\s\S]*"listingDetails"[\s\S]*\}/);
        if (jsonMatch) {
          const json = JSON.parse(jsonMatch[0]);
          parseREANextData(json, data);
        }
      } catch {
        // Skip
      }
    }
  });

  // === Strategy 3: Extract from page content (fallback) ===

  const ogTitle = $('meta[property="og:title"]').attr("content") || "";
  const ogDesc = $('meta[property="og:description"]').attr("content") || "";

  // Address from title
  if (!data.address) {
    const addrParts = parseREATitle(ogTitle || $("title").text());
    if (addrParts) {
      data.address = addrParts.address;
      data.suburb = data.suburb || addrParts.suburb;
      data.state = data.state || addrParts.state;
      data.postcode = data.postcode || addrParts.postcode;
    }
  }

  // Beds/baths/parking from OG description (often contains "3 bed, 2 bath, 1 car")
  if (!data.bedrooms && ogDesc) {
    const bedMatch = ogDesc.match(/(\d+)\s*bed/i);
    const bathMatch = ogDesc.match(/(\d+)\s*bath/i);
    const parkMatch = ogDesc.match(/(\d+)\s*(?:car|parking|garage)/i);

    if (bedMatch) data.bedrooms = parseInt(bedMatch[1]);
    if (bathMatch) data.bathrooms = parseInt(bathMatch[1]);
    if (parkMatch) data.parking = parseInt(parkMatch[1]);
  }

  // Price from OG title or page content
  if (!data.rent_weekly && !data.sale_price && !data.price_guide) {
    const priceText =
      $('[class*="property-price"], [data-testid="listing-price"]').text() ||
      $("h2")
        .filter((_, el) => /\$/.test($(el).text()))
        .first()
        .text() ||
      ogTitle;

    const weeklyMatch = priceText.match(
      /\$[\s]*([\d,]+)\s*(?:pw|per\s*week|\/wk|\/week|week)/i
    );
    const saleMatch = priceText.match(
      /\$[\s]*([\d,]+(?:\.\d+)?)\s*(?:m|million)?/i
    );

    if (weeklyMatch) {
      data.rent_weekly = parseFloat(weeklyMatch[1].replace(/,/g, "")) * 100;
    } else if (saleMatch) {
      let price = parseFloat(saleMatch[1].replace(/,/g, ""));
      if (
        priceText.toLowerCase().includes("million") ||
        priceText.match(/\$[\d.]+m/i)
      ) {
        price *= 1_000_000;
      }
      if (price > 5000) {
        data.sale_price = price * 100;
      }
    }

    const guideMatch = priceText.match(
      /((?:Price\s*Guide|Auction|Offers?\s*(?:over|above|from|around))[\s:]*\$[\d,\s\-–.]+(?:k|m|million)?)/i
    );
    if (guideMatch) data.price_guide = guideMatch[1].trim();
  }

  // Beds/baths/parking from CSS selectors
  if (!data.bedrooms) {
    const featuresText =
      $('[class*="property-features"], [class*="general-features"]').text();

    const bedMatch = featuresText.match(/(\d+)\s*bed/i);
    const bathMatch = featuresText.match(/(\d+)\s*bath/i);
    const parkMatch = featuresText.match(/(\d+)\s*(?:car|parking|garage)/i);

    if (bedMatch) data.bedrooms = parseInt(bedMatch[1]);
    if (bathMatch) data.bathrooms = parseInt(bathMatch[1]);
    if (parkMatch) data.parking = parseInt(parkMatch[1]);
  }

  // Description
  if (!data.description) {
    data.description =
      $('[class*="description"] p, [data-testid="listing-description"] p')
        .map((_, el) => $(el).text())
        .get()
        .join("\n") ||
      ogDesc ||
      undefined;
  }

  // Images
  if (!data.images || data.images.length === 0) {
    const images: string[] = [];
    $('[class*="gallery"] img, [data-testid="gallery-image"]').each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src");
      if (src && !src.includes("placeholder") && src.startsWith("http")) {
        images.push(src);
      }
    });
    const ogImage = $('meta[property="og:image"]').attr("content");
    if (images.length === 0 && ogImage) images.push(ogImage);
    if (images.length > 0) data.images = images;
  }

  // Agent
  if (!data.agent_name) {
    data.agent_name =
      $('[class*="agent-name"], [data-testid="agent-name"]')
        .first()
        .text()
        .trim() || undefined;
  }
  if (!data.agent_agency) {
    data.agent_agency =
      $('[class*="agent-agency"], [data-testid="agency-name"]')
        .first()
        .text()
        .trim() || undefined;
  }
  if (!data.agent_phone) {
    data.agent_phone =
      $('a[href^="tel:"]').first().attr("href")?.replace("tel:", "") ||
      undefined;
  }

  // Property type from URL
  if (!data.property_type) {
    const urlType = url.match(
      /property-(house|apartment|townhouse|villa|unit|studio|duplex|land)/i
    );
    if (urlType)
      data.property_type =
        urlType[1].toLowerCase() as ExtractedProperty["property_type"];
  }

  // Inspection times
  const inspections = $(
    '[class*="inspection"], [data-testid*="inspection"]'
  );
  if (inspections.length > 0 && !data.inspection_times) {
    data.inspection_times = [];
    inspections.each((_, el) => {
      const text = $(el).text().trim();
      const dateMatch = text.match(
        /(\w+)\s+(\d+)\s+(\w+)\s*(\d{4})?\s*(\d{1,2}:\d{2}\s*(?:am|pm)?)\s*[-–]\s*(\d{1,2}:\d{2}\s*(?:am|pm)?)/i
      );
      if (dateMatch) {
        data.inspection_times!.push({
          date: `${dateMatch[1]} ${dateMatch[2]} ${dateMatch[3]} ${dateMatch[4] || new Date().getFullYear()}`,
          start_time: dateMatch[5],
          end_time: dateMatch[6],
        });
      }
    });
  }

  // Sizes
  const sizeText = $('[class*="feature"], [class*="property-size"]').text();
  const landMatch = sizeText.match(
    /([\d,]+)\s*(?:m²|sqm)\s*(?:land|block)/i
  );
  const buildMatch = sizeText.match(
    /([\d,]+)\s*(?:m²|sqm)\s*(?:build|floor|internal)/i
  );
  if (landMatch && !data.land_size_sqm)
    data.land_size_sqm = parseInt(landMatch[1].replace(/,/g, ""));
  if (buildMatch && !data.building_size_sqm)
    data.building_size_sqm = parseInt(buildMatch[1].replace(/,/g, ""));

  // Auction date
  if (!data.auction_date) {
    const auctionText = $('[class*="auction"]').text();
    const auctionMatch = auctionText.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
    if (auctionMatch)
      data.auction_date = `${auctionMatch[1]} ${auctionMatch[2]} ${auctionMatch[3]}`;
  }

  return data;
}

/**
 * Parse REA's ArgonautExchange data.
 *
 * ArgonautExchange is a nested JSON structure that contains all listing data.
 * The data is keyed by entity IDs and needs to be traversed to find listing info.
 * We search recursively for objects that look like listing data.
 */
function parseArgonautExchange(
  json: Record<string, unknown>,
  data: ExtractedProperty
) {
  try {
    // ArgonautExchange is a flat key-value store where values can be:
    // - Strings (sometimes JSON-encoded)
    // - Objects with listing-like fields
    // Walk all values looking for listing data patterns
    walkForListingData(json, data, 0);
  } catch {
    // Structure doesn't match
  }
}

/**
 * Recursively walk the ArgonautExchange JSON looking for listing data.
 * The structure varies but listing data objects typically contain:
 * - address/suburb/state fields
 * - bedrooms/bathrooms/carSpaces fields
 * - price/displayPrice fields
 * - photos/media arrays
 */
function walkForListingData(
  obj: unknown,
  data: ExtractedProperty,
  depth: number
): void {
  if (depth > 8 || obj === null || obj === undefined) return;
  if (typeof obj !== "object") return;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      walkForListingData(item, data, depth + 1);
    }
    return;
  }

  const record = obj as Record<string, unknown>;

  // Check if this object has address-like fields
  if (record.address && typeof record.address === "object") {
    const addr = record.address as Record<string, unknown>;
    const display = addr.display || addr.streetAddress || addr.displayAddress;
    if (display && typeof display === "string" && !data.address) {
      // Clean up display address - may contain "42 Smith St, Fitzroy"
      const parts = display.split(",");
      data.address = data.address || parts[0]?.trim();
    }
    if (addr.suburb && !data.suburb)
      data.suburb = String(addr.suburb);
    if (addr.state && !data.state)
      data.state = String(addr.state).toUpperCase() as AustralianState;
    if (addr.postcode && !data.postcode)
      data.postcode = String(addr.postcode);
    if (addr.streetAddress && !data.address)
      data.address = String(addr.streetAddress);

    // Geocoding
    if (addr.location && typeof addr.location === "object") {
      const loc = addr.location as Record<string, unknown>;
      if (loc.latitude) data.lat = data.lat || Number(loc.latitude) || undefined;
      if (loc.longitude) data.lng = data.lng || Number(loc.longitude) || undefined;
    }
  }

  // Check for flat address fields directly on the object
  if (record.suburb && record.state && record.postcode && !data.suburb) {
    data.suburb = data.suburb || String(record.suburb);
    data.state = data.state || (String(record.state).toUpperCase() as AustralianState);
    data.postcode = data.postcode || String(record.postcode);
  }

  // Bedrooms/bathrooms/parking
  if (record.bedrooms !== undefined && typeof record.bedrooms === "number" && !data.bedrooms)
    data.bedrooms = record.bedrooms;
  if (record.bathrooms !== undefined && typeof record.bathrooms === "number" && !data.bathrooms)
    data.bathrooms = record.bathrooms;
  if (record.carspaces !== undefined && typeof record.carspaces === "number" && !data.parking)
    data.parking = record.carspaces;
  if (record.carSpaces !== undefined && typeof record.carSpaces === "number" && !data.parking)
    data.parking = record.carSpaces as number;

  // General features (REA nests beds/baths/car in a "generalFeatures" or "features" object)
  if (record.generalFeatures && typeof record.generalFeatures === "object") {
    const gf = record.generalFeatures as Record<string, unknown>;
    if (gf.bedrooms && !data.bedrooms) data.bedrooms = Number(typeof gf.bedrooms === "object" ? (gf.bedrooms as Record<string, unknown>).value : gf.bedrooms);
    if (gf.bathrooms && !data.bathrooms) data.bathrooms = Number(typeof gf.bathrooms === "object" ? (gf.bathrooms as Record<string, unknown>).value : gf.bathrooms);
    if (gf.parkingSpaces && !data.parking) data.parking = Number(typeof gf.parkingSpaces === "object" ? (gf.parkingSpaces as Record<string, unknown>).value : gf.parkingSpaces);
  }
  if (record.features && typeof record.features === "object") {
    const feat = record.features as Record<string, unknown>;
    if (feat.general && typeof feat.general === "object") {
      const gen = feat.general as Record<string, unknown>;
      if (gen.bedrooms && !data.bedrooms) data.bedrooms = Number(gen.bedrooms);
      if (gen.bathrooms && !data.bathrooms) data.bathrooms = Number(gen.bathrooms);
      if (gen.parkingSpaces && !data.parking) data.parking = Number(gen.parkingSpaces);
    }
  }

  // Property type
  if (record.propertyType && typeof record.propertyType === "string" && !data.property_type) {
    const pt = record.propertyType.toLowerCase();
    const typeMap: Record<string, ExtractedProperty["property_type"]> = {
      house: "house", apartment: "apartment", unit: "unit",
      townhouse: "townhouse", villa: "villa", studio: "studio",
      duplex: "duplex", land: "land", acreage: "land",
    };
    data.property_type = typeMap[pt] || undefined;
  }

  // Description
  if (record.description && typeof record.description === "string" && !data.description) {
    if (record.description.length > 50) {
      data.description = record.description;
    }
  }

  // Price
  if (record.price && typeof record.price === "object") {
    const price = record.price as Record<string, unknown>;
    if (price.display && !data.price_guide)
      data.price_guide = String(price.display);
    if (price.value && typeof price.value === "number") {
      const val = price.value;
      if (val < 5000 && !data.rent_weekly)
        data.rent_weekly = val * 100;
      else if (val >= 5000 && !data.sale_price)
        data.sale_price = val * 100;
    }
  }
  if (record.displayPrice && typeof record.displayPrice === "string" && !data.price_guide) {
    data.price_guide = record.displayPrice;
  }

  // Images/media
  if (record.media && Array.isArray(record.media) && (!data.images || data.images.length === 0)) {
    const images = record.media
      .filter((m: unknown): m is Record<string, unknown> =>
        typeof m === "object" && m !== null
      )
      .filter((m) => m.type === "photo" || m.type === "image" || m.mediaType === "photo")
      .map((m) => (m.url || m.imageUrl || m.templatedUrl) as string)
      .filter((u): u is string => typeof u === "string" && u.startsWith("http"))
      .slice(0, 20);
    if (images.length > 0) data.images = images;
  }
  if (record.images && Array.isArray(record.images) && (!data.images || data.images.length === 0)) {
    const images = record.images
      .map((img: unknown) => {
        if (typeof img === "string") return img;
        if (typeof img === "object" && img !== null) {
          const o = img as Record<string, unknown>;
          return (o.url || o.uri || o.imageUrl) as string;
        }
        return null;
      })
      .filter((u): u is string => typeof u === "string" && u.startsWith("http"))
      .slice(0, 20);
    if (images.length > 0) data.images = images;
  }

  // Agents/listers
  if (record.agents && Array.isArray(record.agents) && !data.agent_name) {
    const agent = record.agents[0] as Record<string, unknown> | undefined;
    if (agent) {
      data.agent_name = (agent.name || agent.displayName) as string || undefined;
      data.agent_phone = (agent.phone || agent.phoneNumber) as string || undefined;
      data.agent_agency = (agent.agencyName || agent.agency) as string || undefined;
    }
  }
  if (record.lister && typeof record.lister === "object" && !data.agent_name) {
    const lister = record.lister as Record<string, unknown>;
    data.agent_name = (lister.name || lister.displayName) as string || undefined;
    data.agent_phone = (lister.phoneNumber || lister.phone) as string || undefined;
  }
  if (record.listers && Array.isArray(record.listers) && !data.agent_name) {
    const lister = record.listers[0] as Record<string, unknown> | undefined;
    if (lister) {
      data.agent_name = (lister.name || lister.displayName) as string || undefined;
      data.agent_phone = (lister.phoneNumber || lister.phone) as string || undefined;
    }
  }

  // Agency
  if (record.listingCompany && typeof record.listingCompany === "object" && !data.agent_agency) {
    const company = record.listingCompany as Record<string, unknown>;
    data.agent_agency = (company.name || company.businessName) as string || undefined;
  }

  // Land/building size
  if (record.propertySizes && typeof record.propertySizes === "object") {
    const sizes = record.propertySizes as Record<string, unknown>;
    if (sizes.land && !data.land_size_sqm) {
      const land = sizes.land as Record<string, unknown>;
      if (land.displayValue) {
        const match = String(land.displayValue).match(/([\d,]+)/);
        if (match) data.land_size_sqm = parseInt(match[1].replace(/,/g, ""));
      } else if (land.value) {
        data.land_size_sqm = Number(land.value);
      }
    }
    if (sizes.building && !data.building_size_sqm) {
      const building = sizes.building as Record<string, unknown>;
      if (building.displayValue) {
        const match = String(building.displayValue).match(/([\d,]+)/);
        if (match) data.building_size_sqm = parseInt(match[1].replace(/,/g, ""));
      } else if (building.value) {
        data.building_size_sqm = Number(building.value);
      }
    }
  }

  // Geo
  if (record.latitude && record.longitude && !data.lat) {
    data.lat = Number(record.latitude) || undefined;
    data.lng = Number(record.longitude) || undefined;
  }

  // Recurse into child objects (but skip very large arrays to avoid perf issues)
  for (const value of Object.values(record)) {
    if (typeof value === "object" && value !== null) {
      if (Array.isArray(value) && value.length > 50) continue;
      walkForListingData(value, data, depth + 1);
    }
    // Also handle stringified JSON values (ArgonautExchange double-encodes some fields)
    if (typeof value === "string" && value.startsWith("{")) {
      try {
        const parsed = JSON.parse(value);
        walkForListingData(parsed, data, depth + 1);
      } catch {
        // Not valid JSON
      }
    }
  }
}

function parseREANextData(
  json: Record<string, unknown>,
  data: ExtractedProperty
) {
  try {
    const props = json.props as Record<string, unknown>;
    const pageProps = props?.pageProps as Record<string, unknown>;
    const listing = (pageProps?.listing ||
      pageProps?.listingDetails) as Record<string, unknown>;

    if (!listing) return;

    if (listing.address) {
      const addr = listing.address as Record<string, unknown>;
      data.address =
        data.address ||
        (addr.display as string) ||
        (addr.streetAddress as string);
      data.suburb = data.suburb || (addr.suburb as string);
      data.state = data.state || (addr.state as AustralianState);
      data.postcode = data.postcode || (addr.postcode as string);
    }

    if (listing.bedrooms)
      data.bedrooms = data.bedrooms || Number(listing.bedrooms);
    if (listing.bathrooms)
      data.bathrooms = data.bathrooms || Number(listing.bathrooms);
    if (listing.carspaces)
      data.parking = data.parking || Number(listing.carspaces);

    if (listing.description)
      data.description = data.description || (listing.description as string);

    const media = listing.media as Record<string, unknown>[] | undefined;
    if (media && (!data.images || data.images.length === 0)) {
      data.images = media
        .filter((m) => m.type === "photo")
        .map((m) => m.url as string)
        .filter(Boolean);
    }

    // Price data
    if (listing.price) {
      const price = listing.price as Record<string, unknown>;
      if (price.display) data.price_guide = data.price_guide || String(price.display);
    }

    // Agent data
    if (listing.agents && Array.isArray(listing.agents)) {
      const agent = listing.agents[0] as Record<string, unknown>;
      if (agent) {
        data.agent_name = data.agent_name || (agent.name as string) || (agent.displayName as string);
        data.agent_phone = data.agent_phone || (agent.phone as string);
        data.agent_agency = data.agent_agency || (agent.agencyName as string);
      }
    }

    // Geo
    if (listing.geo || listing.location) {
      const geo = (listing.geo || listing.location) as Record<string, unknown>;
      data.lat = data.lat || Number(geo.latitude || geo.lat) || undefined;
      data.lng = data.lng || Number(geo.longitude || geo.lng) || undefined;
    }
  } catch {
    // Structure doesn't match, skip
  }
}

function parseREATitle(title: string): {
  address: string;
  suburb?: string;
  state?: AustralianState;
  postcode?: string;
} | null {
  const match = title.match(
    /^(.+?),\s*(\w[\w\s]+?),?\s+(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\s+(\d{4})/i
  );
  if (match) {
    return {
      address: match[1].trim(),
      suburb: match[2].trim(),
      state: match[3].toUpperCase() as AustralianState,
      postcode: match[4],
    };
  }
  return null;
}
