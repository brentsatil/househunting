/**
 * Inspection reminder service.
 *
 * In production, this would:
 * - Use Supabase Edge Functions or a cron job
 * - Send push notifications or emails before inspection times
 * - Integrate with calendar APIs (Google Calendar, Apple Calendar)
 *
 * For the MVP, inspection reminders are displayed in-app only.
 */

export function getUpcomingInspections(
  inspections: Array<{ datetime: string; property_id: string }>,
  hoursAhead: number = 24
): Array<{ datetime: string; property_id: string }> {
  const now = new Date();
  const cutoff = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  return inspections.filter((inspection) => {
    const dt = new Date(inspection.datetime);
    return dt >= now && dt <= cutoff;
  });
}

export function formatInspectionReminder(
  datetime: string,
  address: string
): string {
  const dt = new Date(datetime);
  const day = dt.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const time = dt.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  });

  return `Inspection at ${address} on ${day} at ${time}`;
}
