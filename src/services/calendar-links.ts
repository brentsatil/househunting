/**
 * Generate deep links for adding inspections to external calendars.
 * These open the calendar app directly with pre-filled event data —
 * much better UX than downloading an ICS file.
 */

interface CalendarLinkParams {
  title: string;
  location: string;
  description?: string;
  start: Date;
  /** Duration in minutes (default 30) */
  durationMinutes?: number;
}

/**
 * Format date for Google Calendar URL (YYYYMMDDTHHmmssZ)
 */
function formatGoogleDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Generate a Google Calendar "Add Event" URL.
 * Opens Google Calendar with event pre-filled — one click to add.
 */
export function googleCalendarUrl(params: CalendarLinkParams): string {
  const duration = params.durationMinutes || 30;
  const end = new Date(params.start.getTime() + duration * 60 * 1000);

  const searchParams = new URLSearchParams({
    action: "TEMPLATE",
    text: params.title,
    dates: `${formatGoogleDate(params.start)}/${formatGoogleDate(end)}`,
    location: params.location,
    details: params.description || "",
  });

  return `https://calendar.google.com/calendar/render?${searchParams.toString()}`;
}

/**
 * Generate an Outlook.com "Add Event" URL.
 */
export function outlookCalendarUrl(params: CalendarLinkParams): string {
  const duration = params.durationMinutes || 30;
  const end = new Date(params.start.getTime() + duration * 60 * 1000);

  const searchParams = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: params.title,
    startdt: params.start.toISOString(),
    enddt: end.toISOString(),
    location: params.location,
    body: params.description || "",
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${searchParams.toString()}`;
}

/**
 * Generate calendar link params from an inspection + property.
 */
export function inspectionCalendarParams(
  property: {
    address: string;
    suburb: string;
    state: string;
    postcode?: string;
    bedrooms?: number | null;
    bathrooms?: number | null;
    property_type?: string | null;
  },
  datetime: Date,
  notes?: string | null
): CalendarLinkParams {
  const features = [
    property.bedrooms ? `${property.bedrooms}bed` : null,
    property.bathrooms ? `${property.bathrooms}bath` : null,
    property.property_type,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    title: `Inspection: ${property.address}, ${property.suburb}`,
    location: `${property.address}, ${property.suburb} ${property.state} ${property.postcode || ""}`.trim(),
    description: [
      features ? `Property: ${features}` : null,
      notes || null,
      "Managed by NestTogether",
    ]
      .filter(Boolean)
      .join("\n"),
    start: datetime,
    durationMinutes: 30,
  };
}

/**
 * Generate all calendar links for a single inspection.
 */
export function allCalendarLinks(
  property: Parameters<typeof inspectionCalendarParams>[0],
  datetime: Date,
  inspectionId: string,
  notes?: string | null
) {
  const params = inspectionCalendarParams(property, datetime, notes);

  return {
    google: googleCalendarUrl(params),
    outlook: outlookCalendarUrl(params),
    ics: `/api/calendar?inspectionId=${inspectionId}`,
  };
}

/**
 * Generate Google Calendar links for a full day's itinerary.
 */
export function dayItineraryLinks(
  inspections: Array<{
    id: string;
    datetime: string;
    notes?: string | null;
    property: Parameters<typeof inspectionCalendarParams>[0];
  }>,
  partnershipId: string,
  date: string // YYYY-MM-DD
) {
  return {
    inspections: inspections.map((i) => ({
      id: i.id,
      ...allCalendarLinks(
        i.property,
        new Date(i.datetime),
        i.id,
        i.notes
      ),
    })),
    icsAll: `/api/calendar?partnershipId=${partnershipId}&date=${date}`,
  };
}
