import * as cheerio from "cheerio";
import type { ExtractedProperty, AustralianState } from "@/types/property";

export async function extractGeneric(url: string): Promise<ExtractedProperty> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const data: ExtractedProperty = {
    source: "manual",
    source_url: url,
  };

  // Extract JSON-LD structured data
  const jsonLdScripts = $('script[type="application/ld+json"]');
  jsonLdScripts.each((_, el) => {
    try {
      const json = JSON.parse($(el).text());
      parseJsonLd(json, data);
    } catch {
      // Invalid JSON-LD, skip
    }
  });

  // Extract OpenGraph tags
  data.description =
    data.description ||
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="description"]').attr("content") ||
    undefined;

  const ogImage = $('meta[property="og:image"]').attr("content");
  if (ogImage && (!data.images || data.images.length === 0)) {
    data.images = [ogImage];
  }

  // Try to extract address from title or OG
  if (!data.address) {
    const title =
      $('meta[property="og:title"]').attr("content") || $("title").text();
    const addressMatch = title?.match(
      /(\d+[\/\-]?\d*\s+[\w\s]+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Court|Ct|Place|Pl|Lane|Ln|Crescent|Cres|Boulevard|Blvd|Way|Circuit|Cct|Parade|Pde|Terrace|Tce)[\w\s,]*)/i
    );
    if (addressMatch) {
      data.address = addressMatch[1].trim();
    }
  }

  return data;
}

function parseJsonLd(json: Record<string, unknown>, data: ExtractedProperty) {
  // Handle arrays of JSON-LD objects
  if (Array.isArray(json)) {
    json.forEach((item) => parseJsonLd(item as Record<string, unknown>, data));
    return;
  }

  const type = json["@type"] as string;

  if (
    type === "RealEstateListing" ||
    type === "Product" ||
    type === "Residence" ||
    type === "House" ||
    type === "Apartment"
  ) {
    data.description = data.description || (json.description as string);

    if (json.name && !data.address) {
      data.address = json.name as string;
    }

    // Handle price
    const offers = json.offers as Record<string, unknown> | undefined;
    if (offers) {
      const price = Number(offers.price || offers.lowPrice);
      if (price && price > 0) {
        // Heuristic: weekly rent is typically < 5000, sale prices are > 50000
        if (price < 5000) {
          data.rent_weekly = price * 100; // Convert to cents
        } else {
          data.sale_price = price * 100;
        }
      }
    }

    // Handle images
    const images = json.image || json.photo;
    if (images) {
      if (typeof images === "string") {
        data.images = [images];
      } else if (Array.isArray(images)) {
        data.images = images
          .map((img) => {
            if (typeof img === "string") return img;
            if (typeof img === "object" && img !== null) {
              const imgObj = img as Record<string, unknown>;
              return (imgObj.url || imgObj.contentUrl) as string;
            }
            return null;
          })
          .filter((url): url is string => url !== null);
      }
    }

    // Handle address
    const address = json.address as Record<string, unknown> | undefined;
    if (address) {
      if (typeof address === "string") {
        data.address = address;
      } else {
        data.address =
          data.address || (address.streetAddress as string) || undefined;
        data.suburb =
          data.suburb || (address.addressLocality as string) || undefined;
        data.state =
          data.state ||
          (address.addressRegion as AustralianState) ||
          undefined;
        data.postcode =
          data.postcode || (address.postalCode as string) || undefined;
      }
    }

    // Handle geo
    const geo = json.geo as Record<string, unknown> | undefined;
    if (geo) {
      data.lat = Number(geo.latitude) || undefined;
      data.lng = Number(geo.longitude) || undefined;
    }

    // Handle number of rooms
    if (json.numberOfRooms) {
      data.bedrooms = Number(json.numberOfRooms) || undefined;
    }
    if (json.numberOfBathroomsTotal) {
      data.bathrooms = Number(json.numberOfBathroomsTotal) || undefined;
    }
  }
}
