import { localeInfo, type Locale } from "@/i18n/config";

/** Dates are plain "YYYY-MM-DD" strings (like the database column), so they sort as text. */

export type Quarter = 1 | 2 | 3 | 4;
export type Period = { year: number; quarter: Quarter | null }; // quarter null = whole year

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [y, m, d] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function toUtc(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Today in the visitor's own time zone. */
export function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const dateFormats = new Map<string, Intl.DateTimeFormat>();

/** "11.10.2026" / "11/10/2026" (short) or "11. Oktober 2026" / "11 أكتوبر 2026" (long). */
export function formatDate(iso: string, locale: Locale, style: "short" | "long" = "short"): string {
  const key = `${locale}-${style}`;
  let format = dateFormats.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(localeInfo[locale].intl, {
      timeZone: "UTC",
      ...(style === "short" ? { day: "2-digit", month: "2-digit", year: "numeric" } : { dateStyle: "long" }),
    });
    dateFormats.set(key, format);
  }
  return format.format(toUtc(iso));
}

/** Date and time of a timestamp (created/updated), in the visitor's time zone. */
export function formatTimestamp(timestamp: string, locale: Locale): string {
  return new Intl.DateTimeFormat(localeInfo[locale].intl, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(timestamp),
  );
}

/** "Oktober" / "أكتوبر" for month 1-12. */
export function monthName(month: number, locale: Locale): string {
  return new Intl.DateTimeFormat(localeInfo[locale].intl, { month: "long", timeZone: "UTC" }).format(
    Date.UTC(2000, month - 1, 1),
  );
}

export function quarterOf(iso: string): { year: number; quarter: Quarter } {
  const [y, m] = iso.split("-").map(Number);
  return { year: y, quarter: (Math.floor((m - 1) / 3) + 1) as Quarter };
}

/** First and last day of a quarter or a whole year, both inclusive. */
export function periodRange({ year, quarter }: Period): { start: string; end: string } {
  const firstMonth = quarter ? (quarter - 1) * 3 + 1 : 1;
  const lastMonth = quarter ? firstMonth + 2 : 12;
  const lastDay = new Date(Date.UTC(year, lastMonth, 0)).getUTCDate();
  return { start: `${year}-${pad(firstMonth)}-01`, end: `${year}-${pad(lastMonth)}-${pad(lastDay)}` };
}

/** The months (1-12) a period covers. */
export function periodMonths({ quarter }: Period): number[] {
  const first = quarter ? (quarter - 1) * 3 + 1 : 1;
  return Array.from({ length: quarter ? 3 : 12 }, (_, i) => first + i);
}

/** The day before an ISO date. */
export function dayBefore(iso: string): string {
  const date = new Date(toUtc(iso) - 86_400_000);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}
