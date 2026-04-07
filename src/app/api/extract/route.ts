import { NextResponse } from "next/server";
import { z } from "zod";
import { extractFromURL } from "@/services/extraction";

const extractSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = extractSchema.parse(body);

    const result = await extractFromURL(url);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          partial: result.partial,
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
