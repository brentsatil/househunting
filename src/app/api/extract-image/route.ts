import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { success: false, error: "AI extraction not configured" },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No image provided" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    const anthropic = new Anthropic();

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `Extract all property listing data from this screenshot of an Australian property listing. Return a JSON object with these fields (omit any you can't determine):

{
  "address": "full street address",
  "suburb": "suburb name",
  "postcode": "4-digit postcode",
  "state": "NSW/VIC/QLD/WA/SA/TAS/ACT/NT",
  "property_type": "house/apartment/townhouse/unit/villa/studio/duplex/land/other",
  "bedrooms": number,
  "bathrooms": number,
  "parking": number,
  "land_size_sqm": number,
  "building_size_sqm": number,
  "rent_weekly": number (dollars, not cents),
  "sale_price": number (dollars, not cents),
  "price_guide": "string like 'Auction $800k-$880k'",
  "bond": number (dollars),
  "description": "listing description text visible",
  "agent_name": "agent name",
  "agent_agency": "agency name",
  "agent_phone": "phone number",
  "pet_policy": "allowed/not_allowed/negotiable",
  "lease_length": "e.g. 12 months",
  "available_date": "YYYY-MM-DD",
  "auction_date": "YYYY-MM-DD",
  "inspection_times": [{"date": "Day DD Month", "start_time": "HH:MM am/pm", "end_time": "HH:MM am/pm"}]
}

Return ONLY valid JSON, no explanation.`,
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { success: false, error: "AI could not parse the image" },
        { status: 422 }
      );
    }

    // Parse the JSON response
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { success: false, error: "Could not extract structured data" },
        { status: 422 }
      );
    }

    const extracted = JSON.parse(jsonMatch[0]);

    // Convert dollar amounts to cents for consistency
    const data = {
      source: "manual" as const,
      ...extracted,
      rent_weekly: extracted.rent_weekly ? extracted.rent_weekly * 100 : undefined,
      sale_price: extracted.sale_price ? extracted.sale_price * 100 : undefined,
      bond: extracted.bond ? extracted.bond * 100 : undefined,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Image extraction error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process image" },
      { status: 500 }
    );
  }
}
