import Anthropic from "@anthropic-ai/sdk";
import * as cheerio from "cheerio";
import type { ExtractedProperty } from "@/types/property";

const anthropic = new Anthropic();

/**
 * Strip HTML down to meaningful content for AI extraction.
 * Removes scripts, styles, nav, footer, ads — keeps text, meta tags, JSON-LD.
 */
function prepareHtmlForAI(html: string, maxChars = 30000): string {
  const $ = cheerio.load(html);

  // Collect structured data first (most valuable, always include)
  const structured: string[] = [];

  // JSON-LD
  $('script[type="application/ld+json"]').each((_, el) => {
    structured.push(`[JSON-LD]: ${$(el).text().trim()}`);
  });

  // Meta tags
  const metaTags = [
    "og:title",
    "og:description",
    "og:image",
    "og:url",
    "og:type",
    "description",
    "title",
  ];
  for (const tag of metaTags) {
    const content =
      $(`meta[property="${tag}"]`).attr("content") ||
      $(`meta[name="${tag}"]`).attr("content");
    if (content) structured.push(`[meta:${tag}]: ${content}`);
  }

  const titleText = $("title").text().trim();
  if (titleText) structured.push(`[title]: ${titleText}`);

  // Remove noise
  $(
    "script, style, noscript, iframe, svg, nav, footer, header, " +
      '[class*="nav"], [class*="footer"], [class*="header"], [class*="cookie"], ' +
      '[class*="banner"], [class*="popup"], [class*="modal"], [class*="ad-"], ' +
      '[role="navigation"], [role="banner"], [role="contentinfo"]'
  ).remove();

  // Get meaningful body text
  const bodyText = $("body")
    .text()
    .replace(/\s+/g, " ")
    .trim();

  const structuredBlock = structured.join("\n");
  const budget = maxChars - structuredBlock.length - 100;

  return `${structuredBlock}\n\n[Page content]:\n${bodyText.slice(0, Math.max(budget, 5000))}`;
}

/**
 * Use Claude to extract structured property data from HTML.
 * This replaces fragile CSS selectors with genuine understanding.
 */
export async function aiExtractProperty(
  html: string,
  url: string,
  source: "rea" | "domain" | "facebook" | "unknown"
): Promise<ExtractedProperty> {
  const prepared = prepareHtmlForAI(html);

  const sourceHint =
    source === "rea"
      ? "realestate.com.au"
      : source === "domain"
        ? "domain.com.au"
        : source === "facebook"
          ? "Facebook Marketplace"
          : "a real estate website";

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `Extract property listing data from this ${sourceHint} page. Return ONLY a JSON object with these fields (omit any you can't determine):

{
  "address": "street address only",
  "suburb": "suburb name",
  "state": "NSW|VIC|QLD|WA|SA|TAS|ACT|NT",
  "postcode": "4-digit postcode",
  "property_type": "house|apartment|townhouse|villa|unit|studio|duplex|land|other",
  "bedrooms": number,
  "bathrooms": number,
  "parking": number,
  "land_size_sqm": number,
  "building_size_sqm": number,
  "rent_weekly_dollars": number (weekly rent in dollars, NOT cents),
  "sale_price_dollars": number (sale price in dollars, NOT cents),
  "price_guide": "original price text if not a clean number",
  "auction_date": "date string if auction",
  "description": "property description (first 500 chars)",
  "images": ["url1", "url2"],
  "agent_name": "agent name",
  "agent_agency": "agency name",
  "agent_phone": "phone number",
  "inspection_times": [{"date": "...", "start_time": "...", "end_time": "..."}],
  "available_date": "availability date if rental",
  "pet_policy": "allowed|not_allowed|negotiable",
  "bond_dollars": number,
  "lease_length": "lease term",
  "strata_fees_quarterly_dollars": number,
  "listed_date": "date listed"
}

Page content from ${url}:

${prepared}`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  const text = textBlock?.text || "{}";

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { source: source === "unknown" ? "manual" : source, source_url: url };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return mapAIResult(parsed, url, source);
  } catch {
    return { source: source === "unknown" ? "manual" : source, source_url: url };
  }
}

function mapAIResult(
  ai: Record<string, unknown>,
  url: string,
  source: "rea" | "domain" | "facebook" | "unknown"
): ExtractedProperty {
  const data: ExtractedProperty = {
    source: source === "unknown" ? "manual" : source,
    source_url: url,
  };

  if (ai.address) data.address = String(ai.address);
  if (ai.suburb) data.suburb = String(ai.suburb);
  if (ai.state) data.state = String(ai.state).toUpperCase() as ExtractedProperty["state"];
  if (ai.postcode) data.postcode = String(ai.postcode);
  if (ai.property_type) data.property_type = String(ai.property_type) as ExtractedProperty["property_type"];
  if (ai.bedrooms) data.bedrooms = Number(ai.bedrooms);
  if (ai.bathrooms) data.bathrooms = Number(ai.bathrooms);
  if (ai.parking) data.parking = Number(ai.parking);
  if (ai.land_size_sqm) data.land_size_sqm = Number(ai.land_size_sqm);
  if (ai.building_size_sqm) data.building_size_sqm = Number(ai.building_size_sqm);
  if (ai.description) data.description = String(ai.description);
  if (ai.agent_name) data.agent_name = String(ai.agent_name);
  if (ai.agent_agency) data.agent_agency = String(ai.agent_agency);
  if (ai.agent_phone) data.agent_phone = String(ai.agent_phone);
  if (ai.price_guide) data.price_guide = String(ai.price_guide);
  if (ai.auction_date) data.auction_date = String(ai.auction_date);
  if (ai.available_date) data.available_date = String(ai.available_date);
  if (ai.lease_length) data.lease_length = String(ai.lease_length);
  if (ai.listed_date) data.listed_date = String(ai.listed_date);

  // Convert dollar amounts to cents
  if (ai.rent_weekly_dollars) data.rent_weekly = Number(ai.rent_weekly_dollars) * 100;
  if (ai.sale_price_dollars) data.sale_price = Number(ai.sale_price_dollars) * 100;
  if (ai.bond_dollars) data.bond = Number(ai.bond_dollars) * 100;
  if (ai.strata_fees_quarterly_dollars) data.strata_fees_quarterly = Number(ai.strata_fees_quarterly_dollars) * 100;

  // Pet policy
  if (ai.pet_policy) {
    const pet = String(ai.pet_policy).toLowerCase();
    if (pet === "allowed" || pet === "not_allowed" || pet === "negotiable") {
      data.pet_policy = pet;
    }
  }

  // Images
  if (Array.isArray(ai.images)) {
    data.images = ai.images
      .filter((img): img is string => typeof img === "string" && img.startsWith("http"))
      .slice(0, 20);
  }

  // Inspection times
  if (Array.isArray(ai.inspection_times)) {
    data.inspection_times = ai.inspection_times
      .filter(
        (t): t is { date: string; start_time: string; end_time?: string } =>
          typeof t === "object" && t !== null && "date" in t && "start_time" in t
      )
      .map((t) => ({
        date: String(t.date),
        start_time: String(t.start_time),
        end_time: t.end_time ? String(t.end_time) : undefined,
      }));
  }

  return data;
}

/**
 * Quick extraction using only structured data (JSON-LD + meta tags).
 * No AI call — fast and free. Used as the first parsing attempt.
 */
export function extractStructuredData(
  html: string,
  url: string,
  source: "rea" | "domain" | "facebook" | "unknown"
): ExtractedProperty {
  const $ = cheerio.load(html);

  const data: ExtractedProperty = {
    source: source === "unknown" ? "manual" : source,
    source_url: url,
    images: [],
  };

  // Parse all JSON-LD blocks
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).text());
      parseJsonLdRecursive(json, data);
    } catch {
      // Skip invalid JSON-LD
    }
  });

  // OpenGraph meta tags
  const og = (prop: string) =>
    $(`meta[property="og:${prop}"]`).attr("content") ||
    $(`meta[name="${prop}"]`).attr("content");

  if (!data.address) {
    const title = og("title") || $("title").text();
    const addrMatch = title?.match(
      /^(.+?),\s*(\w[\w\s]+?),?\s+(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\s+(\d{4})/i
    );
    if (addrMatch) {
      data.address = addrMatch[1].trim();
      data.suburb = data.suburb || addrMatch[2].trim();
      data.state = data.state || (addrMatch[3].toUpperCase() as ExtractedProperty["state"]);
      data.postcode = data.postcode || addrMatch[4];
    }
  }

  if (!data.description) {
    data.description = og("description") || undefined;
  }

  const ogImage = og("image");
  if (ogImage && data.images!.length === 0) {
    data.images = [ogImage];
  }

  return data;
}

function parseJsonLdRecursive(json: unknown, data: ExtractedProperty): void {
  if (Array.isArray(json)) {
    json.forEach((item) => parseJsonLdRecursive(item, data));
    return;
  }

  if (typeof json !== "object" || json === null) return;

  const obj = json as Record<string, unknown>;
  const type = obj["@type"] as string;

  if (
    type === "RealEstateListing" ||
    type === "Product" ||
    type === "Residence" ||
    type === "House" ||
    type === "Apartment"
  ) {
    const address = obj.address as Record<string, unknown> | undefined;
    if (address && typeof address === "object") {
      data.address = data.address || (address.streetAddress as string) || undefined;
      data.suburb = data.suburb || (address.addressLocality as string) || undefined;
      data.state =
        data.state ||
        (address.addressRegion as ExtractedProperty["state"]) ||
        undefined;
      data.postcode = data.postcode || (address.postalCode as string) || undefined;
    }

    const geo = obj.geo as Record<string, unknown> | undefined;
    if (geo) {
      data.lat = data.lat || Number(geo.latitude) || undefined;
      data.lng = data.lng || Number(geo.longitude) || undefined;
    }

    if (obj.description && !data.description) {
      data.description = String(obj.description);
    }

    if (obj.numberOfRooms) data.bedrooms = data.bedrooms || Number(obj.numberOfRooms);
    if (obj.numberOfBathroomsTotal) data.bathrooms = data.bathrooms || Number(obj.numberOfBathroomsTotal);

    const images = (obj.image || obj.photo) as unknown;
    if (images && (!data.images || data.images.length === 0)) {
      if (typeof images === "string") {
        data.images = [images];
      } else if (Array.isArray(images)) {
        data.images = images
          .map((img) =>
            typeof img === "string"
              ? img
              : typeof img === "object" && img !== null
                ? ((img as Record<string, unknown>).url as string) ||
                  ((img as Record<string, unknown>).contentUrl as string)
                : null
          )
          .filter((u): u is string => typeof u === "string");
      }
    }

    // Handle offers/price
    const offers = obj.offers as Record<string, unknown> | undefined;
    if (offers) {
      const price = Number(offers.price || offers.lowPrice);
      if (price > 0) {
        if (price < 5000) {
          data.rent_weekly = data.rent_weekly || price * 100;
        } else {
          data.sale_price = data.sale_price || price * 100;
        }
      }
    }
  }

  // Recurse into nested objects
  if (obj["@graph"]) {
    parseJsonLdRecursive(obj["@graph"], data);
  }
}
