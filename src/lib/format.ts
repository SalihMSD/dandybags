import { PRICE_PLACEHOLDER } from "./site";

export function formatInr(value: number | null | undefined) {
  if (value == null) return PRICE_PLACEHOLDER;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function discountPercent(mrp: number | null, selling: number | null) {
  if (mrp == null || selling == null || mrp <= selling) return null;
  return Math.round(((mrp - selling) / mrp) * 100);
}

export const INDIA_TZ = "Asia/Kolkata";

export function formatIndiaDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: INDIA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "00";
  const d = parts.find((p) => p.type === "day")?.value ?? "00";
  return `${y}-${m}-${d}`;
}

export function getTimezoneOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const s = Number(parts.find((p) => p.type === "second")?.value ?? 0);
  const tzTimeOfDay = h * 3600000 + m * 60000 + s * 1000;
  const utcTimeOfDay = date.getUTCHours() * 3600000 + date.getUTCMinutes() * 60000 + date.getUTCSeconds() * 1000;
  let offset = tzTimeOfDay - utcTimeOfDay;
  if (offset > 12 * 3600000) offset -= 24 * 3600000;
  if (offset < -12 * 3600000) offset += 24 * 3600000;
  return offset;
}

export function indiaDateToUtcRange(dateStr: string): { start: Date; endExclusive: Date } {
  const [year, month, day] = dateStr.split("-").map(Number);
  const utcMidnight = Date.UTC(year, month - 1, day);
  const offset = getTimezoneOffsetMs(new Date(utcMidnight), INDIA_TZ);
  const start = new Date(utcMidnight - offset);
  const endExclusive = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, endExclusive };
}

export function subtractDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - days);
  const ny = date.getUTCFullYear();
  const nm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const nd = String(date.getUTCDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}
