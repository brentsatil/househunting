import * as cheerio from "cheerio";
import type { ExtractedProperty } from "@/types/property";

/**
 * Facebook Marketplace extraction is best-effort only.
 * Facebook aggressively blocks scraping, so we extract what we can from
 * OpenGraph meta tags and pre-fill a form for the user to complete.
 */
export async function extractFromFacebook(url: string): Promise<ExtractedProperty> {
  const data: ExtractedProperty = {
    source: "facebook",
    source_url: url,
    images: [],
    missing_fields: [],
  };

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      // Facebook often blocks/redirects - return minimal data
      data.missing_fields = ["address", "suburb", "postcode", "state", "bedrooms", "bathrooms", "rent_weekly"];
      return data;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract OpenGraph tags (usually the most we can get from FB)
    const ogTitle = $('meta[property="og:title"]').attr("content") || "";
    const ogDesc = $('meta[property="og:description"]').attr("content") || "";
    const ogImage = $('meta[property="og:image"]').attr("content");

    // Try to parse title for property info
    if (ogTitle) {
      // FB Marketplace titles are often: "$450/week - 2 bed apartment in Fitzroy"
      const priceMatch = ogTitle.match(/\$[\s]*([\d,]+)\s*(?:\/?\s*(?:pw|per\s*week|week|wk))?/i);
      if (priceMatch) {
        const price = parseFloat(priceMatch[1].replace(/,/g, ""));
        if (price < 5000) {
          data.rent_weekly = price * 100;
        } else {
          data.sale_price = price * 100;
        }
      }

      const bedMatch = ogTitle.match(/(\d+)\s*(?:bed|br|bedroom)/i);
      if (bedMatch) data.bedrooms = parseInt(bedMatch[1]);

      const bathMatch = ogTitle.match(/(\d+)\s*(?:bath|bathroom)/i);
      if (bathMatch) data.bathrooms = parseInt(bathMatch[1]);

      // Try to extract location
      const locationMatch = ogTitle.match(/(?:in|at)\s+([\w\s]+?)(?:\s*[-–|,]|$)/i);
      if (locationMatch) {
        data.suburb = locationMatch[1].trim();
      }
    }

    if (ogDesc) {
      data.description = ogDesc;
    }

    if (ogImage) {
      data.images = [ogImage];
    }

    // Extract listing ID from URL
    const idMatch = url.match(/\/(?:item|listing)\/(\d+)/);
    if (idMatch) {
      data.external_id = idMatch[1];
    }
  } catch {
    // Facebook blocked the request - expected behavior
  }

  // Always mark common fields as potentially missing for FB
  const alwaysCheckFields = ["address", "suburb", "postcode", "state"];
  data.missing_fields = alwaysCheckFields.filter(
    (field) => !data[field as keyof ExtractedProperty]
  );

  return data;
}
