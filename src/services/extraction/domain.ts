import * as cheerio from "cheerio";
import type { ExtractedProperty, AustralianState, PropertyType } from "@/types/property";

export async function extractFromDomain(url: string): Promise<ExtractedProperty> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Domain listing: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const data: ExtractedProperty = {
    source: "domain",
    source_url: url,
    images: [],
  };

  // Extract listing ID from URL
  const idMatch = url.match(/(\d{7,})/);
  if (idMatch) {
    data.external_id = idMatch[1];
  }

  // Parse JSON-LD structured data (Domain embeds this)
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).text());
      parseDomainJsonLd(json, data);
    } catch {
      // Skip invalid JSON-LD
    }
  });

  // Parse meta tags for additional data
  const ogTitle = $('meta[property="og:title"]').attr("content") || "";
  const ogDesc = $('meta[property="og:description"]').attr("content") || "";

  // Extract price from meta or page content
  if (!data.rent_weekly && !data.sale_price) {
    const priceText =
      $('[data-testid="listing-details__summary-title"]').text() ||
      $(".listing-details__summary-title").text() ||
      ogTitle;

    const weeklyMatch = priceText.match(/\$[\s]*([\d,]+)\s*(?:pw|per\s*week|\/wk|\/week)/i);
    const saleMatch = priceText.match(/\$[\s]*([\d,]+(?:\.\d+)?)\s*(?:m|million)?/i);

    if (weeklyMatch) {
      data.rent_weekly = parseFloat(weeklyMatch[1].replace(/,/g, "")) * 100;
    } else if (saleMatch) {
      let price = parseFloat(saleMatch[1].replace(/,/g, ""));
      if (priceText.toLowerCase().includes("million") || priceText.toLowerCase().includes("m")) {
        price *= 1_000_000;
      }
      if (price > 5000) {
        data.sale_price = price * 100;
      }
    }

    // Extract price guide text
    const guideMatch = priceText.match(/((?:Price\s*Guide|Auction|Offers?\s*(?:over|above|from))[\s:]*\$[\d,\s\-–]+(?:k|m|million)?)/i);
    if (guideMatch) {
      data.price_guide = guideMatch[1].trim();
    }
  }

  // Extract beds/baths/parking from feature icons
  const features = $('[data-testid="property-features"] span, .listing-details__listing-summary-features span');
  features.each((_, el) => {
    const text = $(el).text().trim();
    const label = $(el).next().text().trim().toLowerCase() || $(el).parent().text().trim().toLowerCase();

    const num = parseInt(text);
    if (isNaN(num)) return;

    if (label.includes("bed")) data.bedrooms = num;
    else if (label.includes("bath")) data.bathrooms = num;
    else if (label.includes("parking") || label.includes("car")) data.parking = num;
  });

  // Alternative: parse from summary icons
  if (!data.bedrooms) {
    const summaryText = $('[data-testid="property-features"]').text() || $(".property-features").text();
    const bedMatch = summaryText.match(/(\d+)\s*bed/i);
    const bathMatch = summaryText.match(/(\d+)\s*bath/i);
    const parkMatch = summaryText.match(/(\d+)\s*(?:car|parking)/i);

    if (bedMatch) data.bedrooms = parseInt(bedMatch[1]);
    if (bathMatch) data.bathrooms = parseInt(bathMatch[1]);
    if (parkMatch) data.parking = parseInt(parkMatch[1]);
  }

  // Extract description
  if (!data.description) {
    data.description =
      $('[data-testid="listing-details__description"] p').text() ||
      $(".listing-details__description p").text() ||
      ogDesc ||
      undefined;
  }

  // Extract images
  if (data.images!.length === 0) {
    $('img[data-testid="listing-details__gallery-image"], .listing-details__gallery img').each(
      (_, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src");
        if (src && !src.includes("placeholder")) {
          data.images!.push(src);
        }
      }
    );
    // Also check OG image
    const ogImage = $('meta[property="og:image"]').attr("content");
    if (ogImage && data.images!.length === 0) {
      data.images!.push(ogImage);
    }
  }

  // Extract agent details
  const agentName = $('[data-testid="listing-details__agent-name"]').first().text().trim() ||
    $(".agent-info__name").first().text().trim();
  const agentAgency = $('[data-testid="listing-details__agent-agency"]').first().text().trim() ||
    $(".agent-info__agency").first().text().trim();
  const agentPhone = $('a[href^="tel:"]').first().attr("href")?.replace("tel:", "");

  if (agentName) data.agent_name = agentName;
  if (agentAgency) data.agent_agency = agentAgency;
  if (agentPhone) data.agent_phone = agentPhone;

  // Extract property type from breadcrumbs or meta
  const propertyTypeText = $('[data-testid="listing-details__property-type"]').text().toLowerCase() ||
    $('meta[name="property-type"]').attr("content")?.toLowerCase() || "";
  data.property_type = mapPropertyType(propertyTypeText);

  // Extract inspection times
  const inspectionElements = $('[data-testid="listing-details__inspection-time"], .listing-details__inspection-time');
  if (inspectionElements.length > 0) {
    data.inspection_times = [];
    inspectionElements.each((_, el) => {
      const text = $(el).text().trim();
      const dateMatch = text.match(/(\w+)\s+(\d+)\s+(\w+)\s+(\d{4})?\s*(\d{1,2}:\d{2}\s*(?:am|pm)?)\s*-\s*(\d{1,2}:\d{2}\s*(?:am|pm)?)/i);
      if (dateMatch) {
        data.inspection_times!.push({
          date: `${dateMatch[1]} ${dateMatch[2]} ${dateMatch[3]} ${dateMatch[4] || new Date().getFullYear()}`,
          start_time: dateMatch[5],
          end_time: dateMatch[6],
        });
      }
    });
  }

  // Extract land size
  const landSizeText = $('[data-testid="property-features__land-size"]').text() ||
    $('[data-testid="listing-details__land-size"]').text();
  const landMatch = landSizeText.match(/([\d,]+)\s*(?:m²|sqm)/i);
  if (landMatch) {
    data.land_size_sqm = parseInt(landMatch[1].replace(/,/g, ""));
  }

  // Parse address from title if not found in JSON-LD
  if (!data.address) {
    const title = $("title").text() || ogTitle;
    const addressParts = parseAddressFromTitle(title);
    if (addressParts) {
      data.address = addressParts.address;
      data.suburb = data.suburb || addressParts.suburb;
      data.state = data.state || addressParts.state;
      data.postcode = data.postcode || addressParts.postcode;
    }
  }

  return data;
}

function parseDomainJsonLd(json: Record<string, unknown>, data: ExtractedProperty) {
  if (Array.isArray(json)) {
    json.forEach((item) => parseDomainJsonLd(item as Record<string, unknown>, data));
    return;
  }

  const type = json["@type"] as string;

  if (type === "RealEstateListing" || type === "Residence" || type === "Product") {
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
    if (json.numberOfRooms) data.bedrooms = Number(json.numberOfRooms);
    if (json.numberOfBathroomsTotal) data.bathrooms = Number(json.numberOfBathroomsTotal);

    const images = (json.image || json.photo) as string | string[] | Record<string, unknown>[] | undefined;
    if (images) {
      if (typeof images === "string") {
        data.images = [images];
      } else if (Array.isArray(images)) {
        data.images = images.map((img) =>
          typeof img === "string" ? img : ((img as Record<string, unknown>).url as string)
        ).filter(Boolean);
      }
    }
  }
}

function mapPropertyType(text: string): ExtractedProperty["property_type"] {
  if (text.includes("house")) return "house";
  if (text.includes("apartment") || text.includes("flat")) return "apartment";
  if (text.includes("townhouse")) return "townhouse";
  if (text.includes("villa")) return "villa";
  if (text.includes("unit")) return "unit";
  if (text.includes("studio")) return "studio";
  if (text.includes("duplex")) return "duplex";
  if (text.includes("land")) return "land";
  return undefined;
}

function parseAddressFromTitle(title: string): {
  address: string;
  suburb?: string;
  state?: AustralianState;
  postcode?: string;
} | null {
  // Domain titles are typically: "123 Main Street, Suburb NSW 2000 - Property for Sale/Rent"
  const match = title.match(
    /^(.+?),\s*(\w[\w\s]+?)\s+(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\s+(\d{4})/i
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
