// Helper to build a Google Calendar Web Intent URL
export function createGoogleCalendarUrl({
  title,
  details,
  location,
  startDate,
  durationMinutes = 30,
  recurrence = "RRULE:FREQ=WEEKLY;BYDAY=SU", // Default: Every Sunday
}: {
  title: string;
  details: string;
  location?: string;
  startDate?: Date;
  durationMinutes?: number;
  recurrence?: string;
}): string {
  const start = startDate || new Date();
  // Round to next hour or 20:00 tonight if earlier
  if (!startDate) {
    start.setHours(20, 0, 0, 0);
    if (start.getTime() < Date.now()) {
      start.setDate(start.getDate() + 1);
    }
  }

  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const formatIsoDate = (d: Date) => {
    return d.toISOString().replace(/-|:|\.\d+/g, "");
  };

  const datesParam = `${formatIsoDate(start)}/${formatIsoDate(end)}`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    details: details,
    dates: datesParam,
    recur: recurrence,
  });

  if (location) {
    params.set("location", location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Helper to generate and download an .ics file for native Apple/Outlook/Google calendars
export function downloadIcsFile({
  title,
  details,
  startDate,
  durationMinutes = 30,
}: {
  title: string;
  details: string;
  startDate?: Date;
  durationMinutes?: number;
}) {
  const start = startDate || new Date();
  if (!startDate) {
    start.setHours(20, 0, 0, 0);
    if (start.getTime() < Date.now()) {
      start.setDate(start.getDate() + 1);
    }
  }
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const formatIcsDate = (d: Date) => {
    return d.toISOString().replace(/-|:|\.\d+/g, "").substring(0, 15) + "Z";
  };

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Con Co O Day//Family Care//VI",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:care-${Date.now()}@concooday.app`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${details.replace(/\n/g, "\\n")}`,
    "RRULE:FREQ=WEEKLY;BYDAY=SU",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute("download", "Lich_Goi_Hoi_Tham_Bo_Me.ics");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
