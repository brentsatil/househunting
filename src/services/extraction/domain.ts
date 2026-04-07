import * as cheerio from "cheerio";
import type { ExtractedProperty, AustralianState } from "@/types/property";

/**
 * Domain-specific HTML parsing.
 * Extracts data from domain.com.au HTML using CSS selectors and data-testid attributes.
 * JSON-LD and meta tags are handled by the shared extractStructuredData().
 */
export function parseDomainHtml(
  html: string,
  url: string,
  base: ExtractedProperty
): ExtractedProperty {
  const $ = cheerio.load(html);
  const data = { ...base };

  const ogTitle = $('meta[property="og:title"]').attr("content") || "";
  const ogDesc = $('meta[property="og:description"]').attr("content") || "";

  // Price
  if (!data.rent_weekly && !data.sale_price) {
    const priceText =
      $('[data-testid="listing-details__summary-title"]').text() ||
      $(".listing-details__summary-title").text() ||
      ogTitle;

    const weeklyMatch = priceText.match(
      /\$[\s]*([\d,]+)\s*(?:pw|per\s*week|\/wk|\/week)/i
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
        priceText.toLowerCase().includes("m")
      ) {
        price *= 1_000_000;
      }
      if (price > 5000) data.sale_price = price * 100;
    }

    const guideMatch = priceText.match(
      /((?:Price\s*Guide|Auction|Offers?\s*(?:over|above|from))[\s:]*\$[\d,\s\-–]+(?:k|m|million)?)/i
    );
    if (guideMatch) data.price_guide = guideMatch[1].trim();
  }

  // Beds/baths/parking from feature elements
  if (!data.bedrooms) {
    const features = $(
      '[data-testid="property-features"] span, .listing-details__listing-summary-features span'
    );
    features.each((_, el) => {
      const text = $(el).text().trim();
      const label =
        $(el).next().text().trim().toLowerCase() ||
        $(el).parent().text().trim().toLowerCase();
      const num = parseInt(text);
      if (isNaN(num)) return;

      if (label.includes("bed")) data.bedrooms = num;
      else if (label.includes("bath")) data.bathrooms = num;
      else if (label.includes("parking") || label.includes("car"))
        data.parking = num;
    });
  }

  // Alternative beds/baths from summary
  if (!data.bedrooms) {
    const summaryText =
      $('[data-testid="property-features"]').text() ||
      $(".property-features").text();
    const bedMatch = summaryText.match(/(\d+)\s*bed/i);
    const bathMatch = summaryText.match(/(\d+)\s*bath/i);
    const parkMatch = summaryText.match(/(\d+)\s*(?:car|parking)/i);

    if (bedMatch) data.bedrooms = parseInt(bedMatch[1]);
    if (bathMatch) data.bathrooms = parseInt(bathMatch[1]);
    if (parkMatch) data.parking = parseInt(parkMatch[1]);
  }

  // Description
  if (!data.description) {
    data.description =
      $('[data-testid="listing-details__description"] p').text() ||
      $(".listing-details__description p").text() ||
      ogDesc ||
      undefined;
  }

  // Images
  if (!data.images || data.images.length === 0) {
    const images: string[] = [];
    $(
      'img[data-testid="listing-details__gallery-image"], .listing-details__gallery img'
    ).each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src");
      if (src && !src.includes("placeholder")) images.push(src);
    });
    const ogImage = $('meta[property="og:image"]').attr("content");
    if (images.length === 0 && ogImage) images.push(ogImage);
    if (images.length > 0) data.images = images;
  }

  // Agent
  if (!data.agent_name) {
    data.agent_name =
      $('[data-testid="listing-details__agent-name"]').first().text().trim() ||
      $(".agent-info__name").first().text().trim() ||
      undefined;
  }
  if (!data.agent_agency) {
    data.agent_agency =
      $('[data-testid="listing-details__agent-agency"]')
        .first()
        .text()
        .trim() ||
      $(".agent-info__agency").first().text().trim() ||
      undefined;
  }
  if (!data.agent_phone) {
    data.agent_phone =
      $('a[href^="tel:"]').first().attr("href")?.replace("tel:", "") ||
      undefined;
  }

  // Property type
  if (!data.property_type) {
    const ptText =
      $('[data-testid="listing-details__property-type"]')
        .text()
        .toLowerCase() ||
      $('meta[name="property-type"]').attr("content")?.toLowerCase() ||
      "";
    data.property_type = mapPropertyType(ptText);
  }

  // Inspection times
  if (!data.inspection_times) {
    const inspectionEls = $(
      '[data-testid="listing-details__inspection-time"], .listing-details__inspection-time'
    );
    if (inspectionEls.length > 0) {
      data.inspection_times = [];
      inspectionEls.each((_, el) => {
        const text = $(el).text().trim();
        const dateMatch = text.match(
          /(\w+)\s+(\d+)\s+(\w+)\s+(\d{4})?\s*(\d{1,2}:\d{2}\s*(?:am|pm)?)\s*-\s*(\d{1,2}:\d{2}\s*(?:am|pm)?)/i
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
  }

  // Land size
  if (!data.land_size_sqm) {
    const landText =
      $('[data-testid="property-features__land-size"]').text() ||
      $('[data-testid="listing-details__land-size"]').text();
    const landMatch = landText.match(/([\d,]+)\s*(?:m²|sqm)/i);
    if (landMatch)
      data.land_size_sqm = parseInt(landMatch[1].replace(/,/g, ""));
  }

  // Address from title
  if (!data.address) {
    const title = $("title").text() || ogTitle;
    const match = title.match(
      /^(.+?),\s*(\w[\w\s]+?)\s+(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\s+(\d{4})/i
    );
    if (match) {
      data.address = match[1].trim();
      data.suburb = data.suburb || match[2].trim();
      data.state =
        data.state || (match[3].toUpperCase() as AustralianState);
      data.postcode = data.postcode || match[4];
    }
  }

  return data;
}

function mapPropertyType(
  text: string
): ExtractedProperty["property_type"] {
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
