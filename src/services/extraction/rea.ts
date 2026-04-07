import * as cheerio from "cheerio";
import type { ExtractedProperty, AustralianState } from "@/types/property";

async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-AU,en;q=0.9",
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, { headers });
    if (response.ok) return response;
    if (response.status === 429 && attempt < retries) {
      // Exponential backoff: 2s, 4s
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }
    if (response.status === 429) {
      throw new Error("REA is rate-limiting requests. Try again in a moment, or the listing will be partially extracted.");
    }
    throw new Error(`Failed to fetch REA listing: ${response.status}`);
  }
  throw new Error("Failed to fetch REA listing after retries");
}

export async function extractFromREA(url: string): Promise<ExtractedProperty> {
  const response = await fetchWithRetry(url);

  const html = await response.text();
  const $ = cheerio.load(html);

  const data: ExtractedProperty = {
    source: "rea",
    source_url: url,
    images: [],
  };

  // Extract listing ID from URL (e.g., /property-house-vic-fitzroy-123456789)
  const idMatch = url.match(/(\d{9,})/);
  if (idMatch) {
    data.external_id = idMatch[1];
  }

  // Parse JSON-LD structured data
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).text());
      parseREAJsonLd(json, data);
    } catch {
      // Skip invalid JSON-LD
    }
  });

  // Parse __NEXT_DATA__ or similar embedded JSON (REA uses React SSR)
  $("script").each((_, el) => {
    const text = $(el).text();
    if (text.includes("__NEXT_DATA__") || text.includes("listingDetails")) {
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

  // Extract from meta tags
  const ogTitle = $('meta[property="og:title"]').attr("content") || "";
  const ogDesc = $('meta[property="og:description"]').attr("content") || "";
  const ogImage = $('meta[property="og:image"]').attr("content");

  // Parse address from title if needed
  if (!data.address) {
    const addressParts = parseREAAddress(ogTitle || $("title").text());
    if (addressParts) {
      data.address = addressParts.address;
      data.suburb = data.suburb || addressParts.suburb;
      data.state = data.state || addressParts.state;
      data.postcode = data.postcode || addressParts.postcode;
    }
  }

  // Extract price from page
  if (!data.rent_weekly && !data.sale_price) {
    const priceText =
      $('[class*="property-price"], [data-testid="listing-price"]').text() ||
      $("h2").filter((_, el) => /\$/.test($(el).text())).first().text() ||
      ogTitle;

    const weeklyMatch = priceText.match(/\$[\s]*([\d,]+)\s*(?:pw|per\s*week|\/wk|\/week|week)/i);
    const saleMatch = priceText.match(/\$[\s]*([\d,]+(?:\.\d+)?)\s*(?:m|million)?/i);

    if (weeklyMatch) {
      data.rent_weekly = parseFloat(weeklyMatch[1].replace(/,/g, "")) * 100;
    } else if (saleMatch) {
      let price = parseFloat(saleMatch[1].replace(/,/g, ""));
      if (priceText.toLowerCase().includes("million") || priceText.match(/\$[\d.]+m/i)) {
        price *= 1_000_000;
      }
      if (price > 5000) {
        data.sale_price = price * 100;
      }
    }

    // Price guide
    const guideMatch = priceText.match(/((?:Price\s*Guide|Auction|Offers?\s*(?:over|above|from|around))[\s:]*\$[\d,\s\-–\.]+(?:k|m|million)?)/i);
    if (guideMatch) {
      data.price_guide = guideMatch[1].trim();
    }
  }

  // Extract beds/baths/parking
  if (!data.bedrooms) {
    // REA uses specific data-testid attributes
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

  // Extract description
  if (!data.description) {
    data.description =
      $('[class*="description"] p, [data-testid="listing-description"] p')
        .map((_, el) => $(el).text())
        .get()
        .join("\n") ||
      ogDesc ||
      undefined;
  }

  // Extract images
  if (data.images!.length === 0) {
    $('[class*="gallery"] img, [data-testid="gallery-image"]').each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src");
      if (src && !src.includes("placeholder") && src.startsWith("http")) {
        data.images!.push(src);
      }
    });
    if (ogImage && data.images!.length === 0) {
      data.images!.push(ogImage);
    }
  }

  // Extract agent details
  const agentName =
    $('[class*="agent-name"], [data-testid="agent-name"]').first().text().trim();
  const agentAgency =
    $('[class*="agent-agency"], [data-testid="agency-name"]').first().text().trim();
  const agentPhone = $('a[href^="tel:"]').first().attr("href")?.replace("tel:", "");

  if (agentName) data.agent_name = agentName;
  if (agentAgency) data.agent_agency = agentAgency;
  if (agentPhone) data.agent_phone = agentPhone;

  // Extract property type from URL
  const urlTypeMatch = url.match(/property-(house|apartment|townhouse|villa|unit|studio|duplex|land)/i);
  if (urlTypeMatch) {
    data.property_type = urlTypeMatch[1].toLowerCase() as ExtractedProperty["property_type"];
  }

  // Extract inspection times
  const inspectionTexts = $('[class*="inspection"], [data-testid*="inspection"]');
  if (inspectionTexts.length > 0) {
    data.inspection_times = [];
    inspectionTexts.each((_, el) => {
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

  // Extract land size and building size
  const sizeTexts = $('[class*="feature"], [class*="property-size"]').text();
  const landMatch = sizeTexts.match(/([\d,]+)\s*(?:m²|sqm)\s*(?:land|block)/i);
  const buildMatch = sizeTexts.match(/([\d,]+)\s*(?:m²|sqm)\s*(?:build|floor|internal)/i);
  if (landMatch) data.land_size_sqm = parseInt(landMatch[1].replace(/,/g, ""));
  if (buildMatch) data.building_size_sqm = parseInt(buildMatch[1].replace(/,/g, ""));

  // Extract auction date
  const auctionText = $('[class*="auction"]').text();
  if (auctionText) {
    const auctionMatch = auctionText.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
    if (auctionMatch) {
      data.auction_date = `${auctionMatch[1]} ${auctionMatch[2]} ${auctionMatch[3]}`;
    }
  }

  return data;
}

function parseREAJsonLd(json: Record<string, unknown>, data: ExtractedProperty) {
  if (Array.isArray(json)) {
    json.forEach((item) => parseREAJsonLd(item as Record<string, unknown>, data));
    return;
  }

  const type = json["@type"] as string;
  if (
    type === "RealEstateListing" ||
    type === "Product" ||
    type === "Residence"
  ) {
    const address = json.address as Record<string, unknown> | undefined;
    if (address) {
      data.address = (address.streetAddress as string) || undefined;
      data.suburb = (address.addressLocality as string) || undefined;
      data.state = (address.addressRegion as AustralianState) || undefined;
      data.postcode = (address.postalCode as string) || undefined;
    }

    const geo = json.geo as Record<string, unknown> | undefined;
    if (geo) {
      data.lat = Number(geo.latitude) || undefined;
      data.lng = Number(geo.longitude) || undefined;
    }

    if (json.description) data.description = json.description as string;

    const images = (json.image || json.photo) as string | string[] | undefined;
    if (images) {
      data.images = typeof images === "string" ? [images] : images.filter((img): img is string => typeof img === "string");
    }
  }
}

function parseREANextData(json: Record<string, unknown>, data: ExtractedProperty) {
  // Navigate through REA's next data structure
  try {
    const props = json.props as Record<string, unknown>;
    const pageProps = props?.pageProps as Record<string, unknown>;
    const listing = pageProps?.listing as Record<string, unknown>;

    if (!listing) return;

    if (listing.address) {
      const addr = listing.address as Record<string, unknown>;
      data.address = data.address || (addr.display as string) || (addr.streetAddress as string);
      data.suburb = data.suburb || (addr.suburb as string);
      data.state = data.state || (addr.state as AustralianState);
      data.postcode = data.postcode || (addr.postcode as string);
    }

    if (listing.bedrooms) data.bedrooms = data.bedrooms || Number(listing.bedrooms);
    if (listing.bathrooms) data.bathrooms = data.bathrooms || Number(listing.bathrooms);
    if (listing.carspaces) data.parking = data.parking || Number(listing.carspaces);

    if (listing.description)
      data.description = data.description || (listing.description as string);

    const media = listing.media as Record<string, unknown>[] | undefined;
    if (media && data.images!.length === 0) {
      data.images = media
        .filter((m) => m.type === "photo")
        .map((m) => m.url as string)
        .filter(Boolean);
    }
  } catch {
    // Structure doesn't match, skip
  }
}

function parseREAAddress(title: string): {
  address: string;
  suburb?: string;
  state?: AustralianState;
  postcode?: string;
} | null {
  // REA titles: "123 Main Street, Suburb, VIC 3000 | realestate.com.au"
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
