import { localeInfo, type Locale } from "@/i18n/config";

/** Dates are plain "YYYY-MM-DD" strings (like the database column), so they sort as text. */

export type Quarter = 1 | 2 | 3 | 4;

/** What a report covers: a month, a quarter, a year, or any range of days (both ends included). */
export type ReportPeriod =
  | { type: "month"; year: number; month: number }
  | { type: "quarter"; year: number; quarter: Quarter }
  | { type: "year"; year: number }
  | { type: "range"; start: string; end: string };

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

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** First and last day a report covers, both included. */
export function periodRange(period: ReportPeriod): { start: string; end: string } {
  switch (period.type) {
    case "range":
      return { start: period.start, end: period.end };
    case "month":
      return {
        start: `${period.year}-${pad(period.month)}-01`,
        end: `${period.year}-${pad(period.month)}-${pad(lastDayOfMonth(period.year, period.month))}`,
      };
    case "quarter": {
      const first = (period.quarter - 1) * 3 + 1;
      return {
        start: `${period.year}-${pad(first)}-01`,
        end: `${period.year}-${pad(first + 2)}-${pad(lastDayOfMonth(period.year, first + 2))}`,
      };
    }
    case "year":
      return { start: `${period.year}-01-01`, end: `${period.year}-12-31` };
  }
}

/** The same stretch of time as another kind of report, starting from its first day. */
export function convertPeriod(period: ReportPeriod, type: ReportPeriod["type"]): ReportPeriod {
  const { start, end } = periodRange(period);
  const year = Number(start.slice(0, 4));
  switch (type) {
    case "month":
      return { type, year, month: Number(start.slice(5, 7)) };
    case "quarter":
      return { type, year, quarter: quarterOf(start).quarter };
    case "year":
      return { type, year };
    case "range":
      return { type, start, end };
  }
}

/** Every calendar month a range of days touches, as "YYYY-MM". */
export function monthsBetween(start: string, end: string): string[] {
  const months: string[] = [];
  let year = Number(start.slice(0, 4));
  let month = Number(start.slice(5, 7));
  const last = end.slice(0, 7);
  while (`${year}-${pad(month)}` <= last) {
    months.push(`${year}-${pad(month)}`);
    if (++month > 12) {
      month = 1;
      year++;
    }
  }
  return months;
}

/** "Oktober 2026" / "أكتوبر 2026" for "2026-10" (or just the month name). */
export function monthLabel(key: string, locale: Locale, withYear = true): string {
  const name = monthName(Number(key.slice(5, 7)), locale);
  return withYear ? `${name} ${key.slice(0, 4)}` : name;
}

/** The report a link points to: ?period=2026-10, ?period=2026-Q3, ?period=2026 or ?from=…&to=… */
export function periodFromQuery(params: { get(name: string): string | null }): ReportPeriod | null {
  const from = params.get("from");
  const to = params.get("to");
  if (from && to && isValidIsoDate(from) && isValidIsoDate(to) && from <= to) {
    return { type: "range", start: from, end: to };
  }
  const value = params.get("period") ?? "";
  let match = /^(\d{4})-(\d{2})$/.exec(value);
  if (match && Number(match[2]) >= 1 && Number(match[2]) <= 12) {
    return { type: "month", year: Number(match[1]), month: Number(match[2]) };
  }
  match = /^(\d{4})-Q([1-4])$/.exec(value);
  if (match) return { type: "quarter", year: Number(match[1]), quarter: Number(match[2]) as Quarter };
  match = /^(\d{4})$/.exec(value);
  if (match) return { type: "year", year: Number(match[1]) };
  return null;
}

export function periodToQuery(period: ReportPeriod): string {
  switch (period.type) {
    case "month":
      return `period=${period.year}-${pad(period.month)}`;
    case "quarter":
      return `period=${period.year}-Q${period.quarter}`;
    case "year":
      return `period=${period.year}`;
    case "range":
      return `from=${period.start}&to=${period.end}`;
  }
}

/** The day before an ISO date. */
export function dayBefore(iso: string): string {
  const date = new Date(toUtc(iso) - 86_400_000);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}
