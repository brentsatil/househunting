import * as cheerio from "cheerio";
import type { ExtractedProperty, AustralianState } from "@/types/property";

/**
 * REA-specific HTML parsing.
 * Extracts data from realestate.com.au HTML using:
 * 1. __NEXT_DATA__ embedded JSON (most reliable — REA's own data)
 * 2. CSS selectors for visible page elements
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

  // === REA-specific: Parse __NEXT_DATA__ or embedded listing JSON ===
  $("script").each((_, el) => {
    const text = $(el).text();
    if (text.includes("listingDetails") || text.includes("__NEXT_DATA__")) {
      try {
        // Find the JSON object containing listingDetails
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

  // === Extract from page content (fallback for anything __NEXT_DATA__ missed) ===

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

  // Price
  if (!data.rent_weekly && !data.sale_price) {
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

  // Beds/baths/parking
  if (!data.bedrooms) {
    const featuresText =
      $('[class*="property-features"], [class*="general-features"]').text() ||
      ogDesc;

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
