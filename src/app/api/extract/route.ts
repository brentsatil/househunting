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
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          partial: result.partial,
          needs_html: result.needs_html,
        },
        { status: result.partial ? 206 : 422 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred during extraction",
      },
      { status: 500 }
    );
  }
}
