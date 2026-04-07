import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateICS } from "@/services/calendar";
import type { CalendarEvent } from "@/services/calendar";

/**
 * GET /api/calendar
 *
 * Params:
 *   partnershipId - all inspections for a partnership
 *   inspectionId  - single inspection
 *   date          - filter to a specific date (YYYY-MM-DD), used with partnershipId
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const partnershipId = searchParams.get("partnershipId");
  const inspectionId = searchParams.get("inspectionId");
  const dateFilter = searchParams.get("date"); // YYYY-MM-DD

  const supabase = await createClient();

  if (inspectionId) {
    const { data: inspection } = await supabase
      .from("inspections")
      .select("*, properties(address, suburb, state, postcode)")
      .eq("id", inspectionId)
      .single();

    if (!inspection) {
      return NextResponse.json(
        { error: "Inspection not found" },
        { status: 404 }
      );
    }

    const property = inspection.properties as {
      address: string;
      suburb: string;
      state: string;
      postcode: string;
    };

    const event: CalendarEvent = {
      uid: `inspection-${inspection.id}@nesttogether`,
      summary: `Inspection: ${property.address}, ${property.suburb}`,
      description: inspection.notes || undefined,
      location: `${property.address}, ${property.suburb} ${property.state} ${property.postcode}`,
      start: new Date(inspection.datetime),
      durationMinutes: 30,
    };

    const ics = generateICS([event]);
    return new Response(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="inspection-${property.suburb.toLowerCase()}.ics"`,
      },
    });
  }

  if (partnershipId) {
    const { data: properties } = await supabase
      .from("properties")
      .select("id, address, suburb, state, postcode")
      .eq("partnership_id", partnershipId)
      .eq("is_active", true);

    if (!properties || properties.length === 0) {
      const ics = generateICS([]);
      return new Response(ics, {
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="nesttogether-inspections.ics"',
        },
      });
    }

    const propertyIds = properties.map((p) => p.id);
    const propertyMap = new Map(properties.map((p) => [p.id, p]));

    let query = supabase
      .from("inspections")
      .select("*")
      .in("property_id", propertyIds)
      .order("datetime", { ascending: true });

    // Per-day filtering
    if (dateFilter) {
      const dayStart = new Date(`${dateFilter}T00:00:00`);
      const dayEnd = new Date(`${dateFilter}T23:59:59`);
      query = query
        .gte("datetime", dayStart.toISOString())
        .lte("datetime", dayEnd.toISOString());
    }

    const { data: inspections } = await query;

    const events: CalendarEvent[] = (inspections || []).map((i) => {
      const prop = propertyMap.get(i.property_id)!;
      return {
        uid: `inspection-${i.id}@nesttogether`,
        summary: `Inspection: ${prop.address}, ${prop.suburb}`,
        description: i.notes || undefined,
        location: `${prop.address}, ${prop.suburb} ${prop.state} ${prop.postcode}`,
        start: new Date(i.datetime),
        durationMinutes: 30,
      };
    });

    const ics = generateICS(events);
    const filename = dateFilter
      ? `inspections-${dateFilter}.ics`
      : "nesttogether-inspections.ics";

    return new Response(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  return NextResponse.json(
    { error: "partnershipId or inspectionId required" },
    { status: 400 }
  );
}
