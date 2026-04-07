import type { ExtractedProperty } from "@/types/property";
import { extractFromDomain } from "./domain";
import { extractFromREA } from "./rea";
import { extractFromFacebook } from "./facebook";
import { extractGeneric } from "./generic";

export type ExtractionResult = {
  success: true;
  data: ExtractedProperty;
} | {
  success: false;
  error: string;
  partial?: ExtractedProperty;
};

export function detectSource(url: string): "domain" | "rea" | "facebook" | "unknown" {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes("domain.com.au")) return "domain";
  if (hostname.includes("realestate.com.au")) return "rea";
  if (hostname.includes("facebook.com") || hostname.includes("fb.com")) return "facebook";
  return "unknown";
}

export async function extractFromURL(url: string): Promise<ExtractionResult> {
  try {
    new URL(url);
  } catch {
    return { success: false, error: "Invalid URL" };
  }

  const source = detectSource(url);

  try {
    let data: ExtractedProperty;

    switch (source) {
      case "domain":
        data = await extractFromDomain(url);
        break;
      case "rea":
        data = await extractFromREA(url);
        break;
      case "facebook":
        data = await extractFromFacebook(url);
        break;
      default:
        data = await extractGeneric(url);
        break;
    }

    // Track which required fields are missing for manual completion
    const requiredFields = ["address", "suburb", "postcode", "state"];
    const missing = requiredFields.filter(
      (field) => !data[field as keyof ExtractedProperty]
    );

    if (missing.length > 0) {
      data.missing_fields = missing;
    }

    return { success: true, data };
  } catch (error) {
    // On failure, try generic extraction as fallback
    if (source !== "unknown") {
      try {
        const fallback = await extractGeneric(url);
        fallback.missing_fields = ["address", "suburb", "postcode", "state"].filter(
          (field) => !fallback[field as keyof ExtractedProperty]
        );
        return {
          success: false,
          error: `${source} extraction failed, partial data extracted via fallback`,
          partial: fallback,
        };
      } catch {
        // Both failed
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Extraction failed",
    };
  }
}
