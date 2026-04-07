import { NextResponse } from "next/server";
import { z } from "zod";
import { extractFromURL, extractFromHTML } from "@/services/extraction";

const extractSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  /** Optional: raw HTML from client-side paste (bypasses server-side fetching) */
  html: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, html } = extractSchema.parse(body);

    // If HTML is provided, skip fetching entirely (client-side paste)
    const result = html
      ? await extractFromHTML(html, url)
      : await extractFromURL(url);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
        strategies: result.strategies,
      });
    }

    // Extraction failed — return partial data if available
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        partial: result.partial,
        needs_html: result.needs_html,
      },
      // 206 when we have partial data or can offer HTML paste
      { status: result.partial || result.needs_html ? 206 : 422 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }

    // Safety net: even on unexpected errors, try to return something useful
    // so the client can offer HTML paste as a fallback
    let url: string | undefined;
    try {
      const body = await request.clone().json();
      url = body?.url;
    } catch {
      // Can't recover the URL
    }

    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred during extraction. Try pasting the page HTML instead.",
        needs_html: !!url,
      },
      { status: 500 }
    );
  }
}
