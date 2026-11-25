/** Friendly date and time. The demo business is in Lagos, so times are shown in WAT. */
const zone = "Africa/Lagos";

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatClock(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: zone }).format(date);
}

export function formatDayTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return "";
  const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: zone }).format(date);
  return `${day}, ${formatClock(date)}`;
}
