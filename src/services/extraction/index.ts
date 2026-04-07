import type { ExtractedProperty } from "@/types/property";
import { parseREAUrl, parseDomainUrl, parseFacebookUrl } from "./url-parser";
import { fetchWithStrategies } from "./strategies";
import {
  extractStructuredData,
  aiExtractProperty,
} from "./ai-extract";
import { parseREAHtml } from "./rea";
import { parseDomainHtml } from "./domain";
import { parseFacebookHtml } from "./facebook";

export type ExtractionSource = "domain" | "rea" | "facebook" | "unknown";

export type ExtractionResult =
  | {
      success: true;
      data: ExtractedProperty;
      /** Which strategies succeeded */
      strategies: string[];
    }
  | {
      success: false;
      error: string;
      /** Partial data from URL parsing + whatever we could get */
      partial?: ExtractedProperty;
      /** If true, client should offer HTML paste option */
      needs_html: boolean;
    };

// ---------------------------------------------------------------------------
// Source detection
// ---------------------------------------------------------------------------

export function detectSource(url: string): ExtractionSource {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes("domain.com.au")) return "domain";
  if (hostname.includes("realestate.com.au")) return "rea";
  if (hostname.includes("facebook.com") || hostname.includes("fb.com"))
    return "facebook";
  return "unknown";
}

// ---------------------------------------------------------------------------
// URL-only extraction (zero network cost)
// ---------------------------------------------------------------------------

function extractFromUrl(
  url: string,
  source: ExtractionSource
): Partial<ExtractedProperty> {
  switch (source) {
    case "rea":
      return parseREAUrl(url);
    case "domain":
      return parseDomainUrl(url);
    case "facebook":
      return parseFacebookUrl(url);
    default:
      return {};
  }
}

// ---------------------------------------------------------------------------
// Source-specific HTML parsing
// ---------------------------------------------------------------------------

function parseSourceHtml(
  html: string,
  url: string,
  source: ExtractionSource,
  base: ExtractedProperty
): ExtractedProperty {
  switch (source) {
    case "rea":
      return parseREAHtml(html, url, base);
    case "domain":
      return parseDomainHtml(html, url, base);
    case "facebook":
      return parseFacebookHtml(html, url, base);
    default:
      return base;
  }
}

// ---------------------------------------------------------------------------
// Merge helper: fill missing fields from secondary source
// ---------------------------------------------------------------------------

function mergeExtracted(
  primary: ExtractedProperty,
  secondary: Partial<ExtractedProperty>
): ExtractedProperty {
  const result = { ...primary };

  for (const [key, value] of Object.entries(secondary)) {
    if (key === "source" || key === "source_url") continue;
    if (key === "images") {
      if ((!result.images || result.images.length === 0) && Array.isArray(value) && value.length > 0) {
        result.images = value as string[];
      }
      continue;
    }
    if (key === "inspection_times") {
      if (!result.inspection_times && Array.isArray(value) && value.length > 0) {
        result.inspection_times = value as ExtractedProperty["inspection_times"];
      }
      continue;
    }
    if (key === "missing_fields") continue;
    if (
      value !== undefined &&
      value !== null &&
      (result as Record<string, unknown>)[key] === undefined
    ) {
      (result as Record<string, unknown>)[key] = value;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Data quality check
// ---------------------------------------------------------------------------

const ESSENTIAL_FIELDS = ["address", "suburb", "state"] as const;
const DESIRED_FIELDS = [
  "bedrooms",
  "bathrooms",
  "rent_weekly",
  "sale_price",
  "price_guide",
  "description",
] as const;

function qualityScore(data: ExtractedProperty): number {
  let score = 0;
  for (const f of ESSENTIAL_FIELDS) {
    if (data[f]) score += 3;
  }
  for (const f of DESIRED_FIELDS) {
    if (data[f]) score += 1;
  }
  if (data.images && data.images.length > 0) score += 1;
  return score;
}

// Minimum quality: at least address OR (suburb + state)
function hasMinimumQuality(data: ExtractedProperty): boolean {
  return !!(data.address || (data.suburb && data.state));
}

// ---------------------------------------------------------------------------
// Main extraction pipeline
// ---------------------------------------------------------------------------

/**
 * Extract property data from a URL.
 *
 * Pipeline:
 * 1. Parse URL patterns (zero cost — REA/Domain URLs encode property data)
 * 2. Multi-strategy fetch (desktop, mobile UA, Google cache)
 * 3. Parse HTML: structured data (JSON-LD, OG) + source-specific selectors
 * 4. If quality is low, use Claude AI to extract from HTML (the "superpower")
 * 5. Merge all sources, track missing fields
 *
 * If all fetch strategies fail (rate-limited), returns partial URL data
 * with needs_html=true so the client can offer HTML paste.
 */
export async function extractFromURL(url: string): Promise<ExtractionResult> {
  try {
    new URL(url);
  } catch {
    return { success: false, error: "Invalid URL", needs_html: false };
  }

  const source = detectSource(url);
  const strategies: string[] = [];

  // --- Step 1: URL pattern extraction (always succeeds) ---
  let urlData: Partial<ExtractedProperty> = {};
  try {
    urlData = extractFromUrl(url, source);
  } catch {
    // URL parsing failed — continue with empty data
  }
  strategies.push("url-parse");

  const baseData: ExtractedProperty = {
    source: source === "unknown" ? "manual" : source,
    source_url: url,
    images: [],
    ...urlData,
  };

  // Extract listing ID
  if (!baseData.external_id) {
    const idMatch = url.match(/(\d{7,})/);
    if (idMatch) baseData.external_id = idMatch[1];
  }

  // --- Step 2: Multi-strategy fetch ---
  let fetchResult: Awaited<ReturnType<typeof fetchWithStrategies>>;
  try {
    fetchResult = await fetchWithStrategies(url);
  } catch {
    // All fetch strategies threw — treat as rate-limited
    const partial = { ...baseData };
    partial.missing_fields = ESSENTIAL_FIELDS.filter((f) => !partial[f]);
    return {
      success: false,
      error: "Could not fetch listing. Paste the page HTML to extract data instead.",
      partial,
      needs_html: true,
    };
  }

  if (!fetchResult.ok) {
    // All fetch strategies failed gracefully
    const partial = { ...baseData };
    partial.missing_fields = ESSENTIAL_FIELDS.filter(
      (f) => !partial[f]
    );
    return {
      success: false,
      error: fetchResult.rateLimited
        ? "Rate-limited by the listing site. Paste the page HTML to extract data without fetching."
        : `Could not fetch listing (HTTP ${fetchResult.lastStatus}). Paste the page HTML instead.`,
      partial,
      needs_html: true,
    };
  }

  // --- Step 3: Parse HTML ---
  const html = fetchResult.html;
  strategies.push(fetchResult.strategy);

  // 3a: Structured data (JSON-LD + OG tags) — standardized, stable
  let merged = { ...baseData };
  try {
    const structured = extractStructuredData(html, url, source);
    merged = mergeExtracted(baseData, structured);
    strategies.push("structured-data");
  } catch {
    // Structured data parsing failed — continue
  }

  // 3b: Source-specific selectors (CSS, data-testid, __NEXT_DATA__)
  try {
    const sourceSpecific = parseSourceHtml(html, url, source, merged);
    merged = sourceSpecific;
    strategies.push(`${source}-parser`);
  } catch {
    // Source-specific parsing failed — continue with structured data
  }

  // --- Step 4: AI extraction if quality is low ---
  if (!hasMinimumQuality(merged) || qualityScore(merged) < 5) {
    try {
      const aiData = await aiExtractProperty(html, url, source);
      merged = mergeExtracted(merged, aiData);
      strategies.push("ai-extraction");
    } catch {
      // AI extraction failed — continue with what we have
    }
  }

  // --- Step 5: Track missing fields ---
  const missing = ESSENTIAL_FIELDS.filter((f) => !merged[f]);
  if (missing.length > 0) merged.missing_fields = [...missing];

  // Clean up internal fields
  delete (merged as unknown as Record<string, unknown>)._is_rental;

  return { success: true, data: merged, strategies };
}

/**
 * Extract property data from user-provided HTML (client-side paste).
 * This bypasses ALL rate-limiting since no fetch is needed.
 *
 * Pipeline:
 * 1. Parse URL patterns
 * 2. Parse HTML: structured data + source-specific selectors
 * 3. AI extraction if quality is low
 * 4. Merge all sources
 */
export async function extractFromHTML(
  html: string,
  url: string
): Promise<ExtractionResult> {
  const source = detectSource(url);
  const strategies: string[] = ["html-paste"];

  // URL parsing
  const urlData = extractFromUrl(url, source);
  const baseData: ExtractedProperty = {
    source: source === "unknown" ? "manual" : source,
    source_url: url,
    images: [],
    ...urlData,
  };

  if (!baseData.external_id) {
    const idMatch = url.match(/(\d{7,})/);
    if (idMatch) baseData.external_id = idMatch[1];
  }

  // Structured data
  const structured = extractStructuredData(html, url, source);
  let merged = mergeExtracted(baseData, structured);
  strategies.push("structured-data");

  // Source-specific parsing
  const sourceSpecific = parseSourceHtml(html, url, source, merged);
  merged = sourceSpecific;
  strategies.push(`${source}-parser`);

  // AI extraction if needed
  if (!hasMinimumQuality(merged) || qualityScore(merged) < 5) {
    try {
      const aiData = await aiExtractProperty(html, url, source);
      merged = mergeExtracted(merged, aiData);
      strategies.push("ai-extraction");
    } catch {
      // Continue with what we have
    }
  }

  const missing = ESSENTIAL_FIELDS.filter((f) => !merged[f]);
  if (missing.length > 0) merged.missing_fields = [...missing];

  delete (merged as unknown as Record<string, unknown>)._is_rental;

  return { success: true, data: merged, strategies };
}
