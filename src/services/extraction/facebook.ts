import * as cheerio from "cheerio";
import type { ExtractedProperty } from "@/types/property";

/**
 * Facebook Marketplace HTML parsing.
 * Facebook aggressively blocks server-side fetching, so this parser is
 * primarily used with client-side HTML paste (user copies page source).
 *
 * Extracts from OpenGraph meta tags and any visible listing text.
 */
export function parseFacebookHtml(
  html: string,
  url: string,
  base: ExtractedProperty
): ExtractedProperty {
  const $ = cheerio.load(html);
  const data = { ...base };

  const ogTitle = $('meta[property="og:title"]').attr("content") || "";
  const ogDesc = $('meta[property="og:description"]').attr("content") || "";
  const ogImage = $('meta[property="og:image"]').attr("content");

  // Parse title for property info
  // FB Marketplace titles: "$450/week - 2 bed apartment in Fitzroy"
  if (ogTitle) {
    const priceMatch = ogTitle.match(
      /\$[\s]*([\d,]+)\s*(?:\/?\s*(?:pw|per\s*week|week|wk))?/i
    );
    if (priceMatch && !data.rent_weekly && !data.sale_price) {
      const price = parseFloat(priceMatch[1].replace(/,/g, ""));
      if (price < 5000) {
        data.rent_weekly = price * 100;
      } else {
        data.sale_price = price * 100;
      }
    }

    if (!data.bedrooms) {
      const bedMatch = ogTitle.match(/(\d+)\s*(?:bed|br|bedroom)/i);
      if (bedMatch) data.bedrooms = parseInt(bedMatch[1]);
    }

    if (!data.bathrooms) {
      const bathMatch = ogTitle.match(/(\d+)\s*(?:bath|bathroom)/i);
      if (bathMatch) data.bathrooms = parseInt(bathMatch[1]);
    }

    if (!data.suburb) {
      const locMatch = ogTitle.match(/(?:in|at)\s+([\w\s]+?)(?:\s*[-–|,]|$)/i);
      if (locMatch) data.suburb = locMatch[1].trim();
    }
  }

  // Also parse from page body text (useful when HTML is pasted from browser)
  const bodyText = $("body").text();
  if (bodyText.length > 100) {
    // Try to find structured property details in the body
    if (!data.bedrooms) {
      const bedMatch = bodyText.match(/(\d+)\s*(?:bed(?:room)?s?)/i);
      if (bedMatch) data.bedrooms = parseInt(bedMatch[1]);
    }
    if (!data.bathrooms) {
      const bathMatch = bodyText.match(/(\d+)\s*(?:bath(?:room)?s?)/i);
      if (bathMatch) data.bathrooms = parseInt(bathMatch[1]);
    }
    if (!data.parking) {
      const parkMatch = bodyText.match(
        /(\d+)\s*(?:car\s*(?:space|park)|parking|garage)/i
      );
      if (parkMatch) data.parking = parseInt(parkMatch[1]);
    }

    // Address patterns in body
    if (!data.address) {
      const addrMatch = bodyText.match(
        /(\d+[/\-]?\d*\s+[\w\s]+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Court|Ct|Place|Pl|Lane|Ln|Crescent|Cres))/i
      );
      if (addrMatch) data.address = addrMatch[1].trim();
    }
  }

  if (!data.description && ogDesc) data.description = ogDesc;

  if (ogImage && (!data.images || data.images.length === 0)) {
    data.images = [ogImage];
  }

  // Listing ID from URL
  if (!data.external_id) {
    const idMatch = url.match(/\/(?:item|listing)\/(\d+)/);
    if (idMatch) data.external_id = idMatch[1];
  }

  // Mark commonly missing fields
  const requiredFields = ["address", "suburb", "postcode", "state"] as const;
  data.missing_fields = requiredFields.filter(
    (f) => !data[f]
  );

  return data;
}
