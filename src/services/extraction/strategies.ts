/**
 * Multi-strategy HTML fetching.
 *
 * Instead of a single fetch with retry, we try multiple independent strategies
 * that hit different rate-limit pools and caching layers:
 *
 * 1. Direct fetch with full browser headers + Sec-Fetch-* (looks like real navigation)
 * 2. Mobile UA (separate rate-limit bucket on most CDNs)
 * 3. Google Webcache (cached copy, no hit to origin at all)
 *
 * Each strategy gets its own retry with exponential backoff.
 */

const DESKTOP_UAS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
];

const MOBILE_UAS = [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
];

function browserHeaders(ua: string): Record<string, string> {
  return {
    "User-Agent": ua,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-AU,en;q=0.9",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
  };
}

export type FetchResult =
  | { ok: true; html: string; strategy: string }
  | { ok: false; rateLimited: boolean; lastStatus: number };

async function tryFetch(
  url: string,
  headers: Record<string, string>,
  signal?: AbortSignal
): Promise<Response | null> {
  try {
    return await fetch(url, { headers, redirect: "follow", signal });
  } catch {
    return null;
  }
}

/**
 * Strategy 1: Direct desktop fetch with rotating UAs.
 * 3 attempts with exponential backoff (2s, 6s, 18s).
 */
async function directDesktop(url: string): Promise<FetchResult> {
  let lastStatus = 0;

  for (let i = 0; i < 3; i++) {
    const ua = DESKTOP_UAS[i % DESKTOP_UAS.length];
    const resp = await tryFetch(url, browserHeaders(ua));

    if (!resp) continue;
    if (resp.ok) {
      return { ok: true, html: await resp.text(), strategy: `desktop-${i}` };
    }

    lastStatus = resp.status;
    if (resp.status === 429 && i < 2) {
      await new Promise((r) => setTimeout(r, 2000 * Math.pow(3, i)));
      continue;
    }
    if (resp.status !== 429) break; // non-rate-limit error, don't retry
  }

  return { ok: false, rateLimited: lastStatus === 429, lastStatus };
}

/**
 * Strategy 2: Mobile UA fetch (often a separate rate-limit bucket).
 */
async function mobileFetch(url: string): Promise<FetchResult> {
  for (let i = 0; i < 2; i++) {
    const ua = MOBILE_UAS[i % MOBILE_UAS.length];
    const resp = await tryFetch(url, {
      "User-Agent": ua,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-AU,en;q=0.9",
    });

    if (!resp) continue;
    if (resp.ok) {
      return { ok: true, html: await resp.text(), strategy: `mobile-${i}` };
    }
    if (resp.status === 429 && i < 1) {
      await new Promise((r) => setTimeout(r, 3000));
      continue;
    }
    return { ok: false, rateLimited: resp.status === 429, lastStatus: resp.status };
  }

  return { ok: false, rateLimited: false, lastStatus: 0 };
}

/**
 * Strategy 3: Google Webcache — fetches a cached snapshot,
 * zero load on the origin server.
 */
async function googleCache(url: string): Promise<FetchResult> {
  const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}&strip=1`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const resp = await tryFetch(
      cacheUrl,
      {
        "User-Agent": DESKTOP_UAS[0],
        Accept: "text/html,*/*;q=0.8",
      },
      controller.signal
    );

    if (resp?.ok) {
      const html = await resp.text();
      // Google cache wraps content — check it has real estate data
      if (
        html.includes("realestate.com.au") ||
        html.includes("domain.com.au") ||
        html.includes("application/ld+json") ||
        html.includes("og:title")
      ) {
        return { ok: true, html, strategy: "google-cache" };
      }
    }
  } catch {
    // Abort, network error, or stream read failure — skip this strategy
  } finally {
    clearTimeout(timeout);
  }

  return { ok: false, rateLimited: false, lastStatus: 0 };
}

/**
 * Try all strategies in sequence. Returns HTML on first success.
 * Strategies are ordered by reliability and speed.
 */
export async function fetchWithStrategies(url: string): Promise<FetchResult> {
  // Strategy 1: Direct desktop (fastest, most likely to work)
  const desktop = await directDesktop(url);
  if (desktop.ok) return desktop;

  // Strategy 2: Mobile UA (different rate-limit pool)
  const mobile = await mobileFetch(url);
  if (mobile.ok) return mobile;

  // Strategy 3: Google cache (last resort, may be stale)
  const cache = await googleCache(url);
  if (cache.ok) return cache;

  // All strategies exhausted
  return {
    ok: false,
    rateLimited:
      (desktop as { rateLimited: boolean }).rateLimited ||
      (mobile as { rateLimited: boolean }).rateLimited,
    lastStatus:
      (desktop as { lastStatus: number }).lastStatus ||
      (mobile as { lastStatus: number }).lastStatus,
  };
}
