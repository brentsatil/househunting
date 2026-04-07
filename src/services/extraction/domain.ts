import * as cheerio from "cheerio";
import type { ExtractedProperty, AustralianState } from "@/types/property";

/**
 * Domain-specific HTML parsing.
 * Extracts data from domain.com.au HTML using (in priority order):
 * 1. __NEXT_DATA__ embedded JSON (Domain uses Next.js with SSR data)
 * 2. CSS selectors and data-testid attributes
 *
 * JSON-LD and meta tags are handled by the shared extractStructuredData().
 */
export function parseDomainHtml(
  html: string,
  url: string,
  base: ExtractedProperty
): ExtractedProperty {
  const $ = cheerio.load(html);
  const data = { ...base };

  // === Strategy 1: Parse __NEXT_DATA__ (Domain uses Next.js SSR) ===
  const nextDataScript = $('script#__NEXT_DATA__').text();
  if (nextDataScript) {
    try {
      const json = JSON.parse(nextDataScript);
      parseDomainNextData(json, data);
    } catch {
      // Skip
    }
  }

  // Also check for __NEXT_DATA__ without id attribute (some pages embed it differently)
  if (!nextDataScript) {
    $("script").each((_, el) => {
      const text = $(el).text();
      if (text.includes("__NEXT_DATA__") && text.includes("pageProps")) {
        try {
          const jsonMatch = text.match(/__NEXT_DATA__\s*=\s*(\{[\s\S]*?\});?\s*(?:<\/script>|$)/);
          if (jsonMatch) {
            const json = JSON.parse(jsonMatch[1]);
            parseDomainNextData(json, data);
          }
        } catch {
          // Skip
        }
      }
    });
  }

  // === Strategy 2: CSS selectors and data attributes ===

  const ogTitle = $('meta[property="og:title"]').attr("content") || "";
  const ogDesc = $('meta[property="og:description"]').attr("content") || "";

  // Price
  if (!data.rent_weekly && !data.sale_price && !data.price_guide) {
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

  // Beds/baths/parking from OG description first
  if (!data.bedrooms && ogDesc) {
    const bedMatch = ogDesc.match(/(\d+)\s*bed/i);
    const bathMatch = ogDesc.match(/(\d+)\s*bath/i);
    const parkMatch = ogDesc.match(/(\d+)\s*(?:car|parking)/i);

    if (bedMatch) data.bedrooms = parseInt(bedMatch[1]);
    if (bathMatch) data.bathrooms = parseInt(bathMatch[1]);
    if (parkMatch) data.parking = parseInt(parkMatch[1]);
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

/**
 * Parse Domain's __NEXT_DATA__ JSON.
 * Domain uses Next.js SSR — listing data is in pageProps.
 */
function parseDomainNextData(
  json: Record<string, unknown>,
  data: ExtractedProperty
) {
  try {
    const props = json.props as Record<string, unknown> | undefined;
    const pageProps = props?.pageProps as Record<string, unknown> | undefined;
    if (!pageProps) return;

    // Domain may nest listing data under different keys
    const listing = (
      pageProps.listingDetail ||
      pageProps.listingDetails ||
      pageProps.listing ||
      pageProps.property ||
      pageProps
    ) as Record<string, unknown>;

    if (!listing) return;

    // Address
    if (listing.addressParts && typeof listing.addressParts === "object") {
      const addr = listing.addressParts as Record<string, unknown>;
      if (addr.streetAddress && !data.address)
        data.address = String(addr.streetAddress);
      if (addr.suburb && !data.suburb)
        data.suburb = String(addr.suburb);
      if (addr.stateAbbreviation && !data.state)
        data.state = String(addr.stateAbbreviation).toUpperCase() as AustralianState;
      if (addr.postcode && !data.postcode)
        data.postcode = String(addr.postcode);
      if (addr.displayAddress && !data.address) {
        const parts = String(addr.displayAddress).split(",");
        data.address = parts[0]?.trim();
      }
    }
    if (listing.address && typeof listing.address === "string" && !data.address) {
      const match = listing.address.match(
        /^(.+?),\s*(\w[\w\s]+?)\s+(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\s+(\d{4})/i
      );
      if (match) {
        data.address = match[1].trim();
        data.suburb = data.suburb || match[2].trim();
        data.state = data.state || (match[3].toUpperCase() as AustralianState);
        data.postcode = data.postcode || match[4];
      }
    }
    if (listing.address && typeof listing.address === "object") {
      const addr = listing.address as Record<string, unknown>;
      if (addr.street && !data.address) data.address = String(addr.street);
      if (addr.suburb && !data.suburb) data.suburb = String(addr.suburb);
      if (addr.state && !data.state)
        data.state = String(addr.state).toUpperCase() as AustralianState;
      if (addr.postcode && !data.postcode) data.postcode = String(addr.postcode);
    }

    // Bedrooms/bathrooms/parking
    if (listing.bedrooms && !data.bedrooms) data.bedrooms = Number(listing.bedrooms);
    if (listing.bathrooms && !data.bathrooms) data.bathrooms = Number(listing.bathrooms);
    if (listing.carspaces && !data.parking) data.parking = Number(listing.carspaces);
    if (listing.carSpaces && !data.parking) data.parking = Number(listing.carSpaces);

    // Features object (Domain sometimes nests these)
    if (listing.features && typeof listing.features === "object") {
      const feat = listing.features as Record<string, unknown>;
      if (feat.bedrooms && !data.bedrooms) data.bedrooms = Number(feat.bedrooms);
      if (feat.bathrooms && !data.bathrooms) data.bathrooms = Number(feat.bathrooms);
      if (feat.parking && !data.parking) data.parking = Number(feat.parking);
    }

    // Description
    if (listing.description && !data.description)
      data.description = String(listing.description);

    // Price
    if (listing.price && !data.price_guide && !data.sale_price && !data.rent_weekly) {
      if (typeof listing.price === "string") {
        data.price_guide = listing.price;
      } else if (typeof listing.price === "object") {
        const price = listing.price as Record<string, unknown>;
        if (price.display) data.price_guide = String(price.display);
        if (price.value && typeof price.value === "number") {
          if (price.value < 5000) data.rent_weekly = price.value * 100;
          else data.sale_price = price.value * 100;
        }
      }
    }
    if (listing.displayPrice && typeof listing.displayPrice === "string" && !data.price_guide)
      data.price_guide = listing.displayPrice;

    // Images/photos
    if (!data.images || data.images.length === 0) {
      const photoSources = [
        listing.images, listing.photos, listing.media,
        listing.photoUrls, listing.gallery,
      ];
      for (const source of photoSources) {
        if (Array.isArray(source) && source.length > 0) {
          data.images = source
            .map((img: unknown) => {
              if (typeof img === "string") return img;
              if (typeof img === "object" && img !== null) {
                const o = img as Record<string, unknown>;
                return (o.url || o.imageUrl || o.fullUrl || o.src) as string;
              }
              return null;
            })
            .filter((u): u is string => typeof u === "string" && u.startsWith("http"))
            .slice(0, 20);
          if (data.images.length > 0) break;
        }
      }
    }

    // Agent
    if (listing.agents && Array.isArray(listing.agents) && !data.agent_name) {
      const agent = listing.agents[0] as Record<string, unknown> | undefined;
      if (agent) {
        data.agent_name = (agent.name || agent.displayName) as string || undefined;
        data.agent_phone = (agent.phone || agent.phoneNumber) as string || undefined;
      }
    }
    if (listing.advertiser && typeof listing.advertiser === "object" && !data.agent_agency) {
      const adv = listing.advertiser as Record<string, unknown>;
      data.agent_agency = (adv.name || adv.agencyName) as string || undefined;
    }

    // Property type
    if (listing.propertyType && !data.property_type) {
      data.property_type = mapPropertyType(String(listing.propertyType).toLowerCase());
    }

    // Land size
    if (listing.areaSize && !data.land_size_sqm) {
      data.land_size_sqm = Number(listing.areaSize) || undefined;
    }
    if (listing.landSize && !data.land_size_sqm) {
      data.land_size_sqm = Number(listing.landSize) || undefined;
    }

    // Geo
    if (listing.lat && listing.lng && !data.lat) {
      data.lat = Number(listing.lat) || undefined;
      data.lng = Number(listing.lng) || undefined;
    }
    if (listing.geoLocation && typeof listing.geoLocation === "object" && !data.lat) {
      const geo = listing.geoLocation as Record<string, unknown>;
      data.lat = Number(geo.latitude || geo.lat) || undefined;
      data.lng = Number(geo.longitude || geo.lng) || undefined;
    }

    // Auction date
    if (listing.auctionSchedule && typeof listing.auctionSchedule === "object" && !data.auction_date) {
      const auction = listing.auctionSchedule as Record<string, unknown>;
      if (auction.time) data.auction_date = String(auction.time);
    }

  } catch {
    // Structure doesn't match, skip
  }
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
