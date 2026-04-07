/**
 * ICS calendar file generation for property inspections.
 *
 * Generates standards-compliant iCalendar (.ics) files that work with
 * Google Calendar, Apple Calendar, Outlook, and other calendar apps.
 */

interface CalendarEvent {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  /** Duration in minutes (default 30) */
  durationMinutes?: number;
  /** URL back to the property in the app */
  url?: string;
}

function formatICSDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function buildEvent(event: CalendarEvent): string {
  const duration = event.durationMinutes || 30;
  const end = new Date(event.start.getTime() + duration * 60 * 1000);

  const lines = [
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(event.start)}`,
    `DTEND:${formatICSDate(end)}`,
    `SUMMARY:${escapeICS(event.summary)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICS(event.description)}`);
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeICS(event.location)}`);
  }
  if (event.url) {
    lines.push(`URL:${event.url}`);
  }

  // Set reminder 30 minutes before
  lines.push(
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    `DESCRIPTION:Inspection at ${event.location || "property"}`,
    "END:VALARM"
  );

  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

/**
 * Generate an ICS calendar file from a list of inspection events.
 */
export function generateICS(events: CalendarEvent[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NestTogether//Property Inspections//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:NestTogether Inspections",
    "X-WR-TIMEZONE:Australia/Melbourne",
  ];

  for (const event of events) {
    lines.push(buildEvent(event));
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/**
 * Generate an ICS file for a single inspection.
 */
export function generateSingleICS(event: CalendarEvent): string {
  return generateICS([event]);
}

export type { CalendarEvent };
