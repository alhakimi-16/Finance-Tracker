import { localeInfo, type Locale } from "@/i18n/config";

/** All amounts are whole cents (integers), so sums never pick up floating-point dust. */

const BIDI_MARKS = /[‎‏؜]/g;
const MINUS = "−";

const currencyFormats = new Map<Locale, Intl.NumberFormat>();
const plainFormats = new Map<Locale, Intl.NumberFormat>();

function currencyFormat(locale: Locale) {
  let format = currencyFormats.get(locale);
  if (!format) {
    format = new Intl.NumberFormat(localeInfo[locale].intl, { style: "currency", currency: "EUR" });
    currencyFormats.set(locale, format);
  }
  return format;
}

/**
 * "1.234,50 €" (de) or "1,234.50 €" (ar). With `sign: "always"` positive amounts get a "+";
 * negative amounts always get a real minus sign.
 */
export function formatEuro(cents: number, locale: Locale, sign: "auto" | "always" = "auto"): string {
  const body = currencyFormat(locale)
    .format(Math.abs(cents) / 100)
    .replace(BIDI_MARKS, "");
  if (cents < 0) return MINUS + body;
  if (cents > 0 && sign === "always") return "+" + body;
  return body;
}

/** "12,50" (de) / "12.50" (ar): the value shown in the amount field when editing. */
export function formatAmountInput(cents: number, locale: Locale): string {
  let format = plainFormats.get(locale);
  if (!format) {
    format = new Intl.NumberFormat(localeInfo[locale].intl, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: false,
    });
    plainFormats.set(locale, format);
  }
  return format.format(cents / 100).replace(BIDI_MARKS, "");
}

/** Largest amount the database column numeric(12, 2) can hold. */
export const MAX_CENTS = 99_999_999_999;

/**
 * Reads what someone typed into the amount field and returns cents, or null.
 * Accepts "12", "12,5", "12.50", "1.234,56", "1,234.56", "1 234", a leading +/− and
 * Arabic-Indic digits ("١٢٫٥٠"). A separator followed by exactly three digits is a
 * thousands separator ("1.234" = 1234 €), one or two digits are the cents.
 */
export function parseAmount(raw: string): number | null {
  let s = raw
    .trim()
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, ".")
    .replace(/٬/g, ",")
    .replace(/[\s  '€]/g, "")
    .replace(/^[+\-−]/, "")
    .replace(/[.,]$/, "");

  if (!/^\d[\d.,]*$/.test(s)) return null;

  let fraction = "";
  const last = Math.max(s.lastIndexOf("."), s.lastIndexOf(","));
  if (last >= 0) {
    const after = s.slice(last + 1);
    if (after.length <= 2) {
      fraction = after;
      s = s.slice(0, last);
    } else if (after.length !== 3) {
      return null;
    }
  }

  const whole = s.replace(/[.,]/g, "");
  if (!/^\d+$/.test(whole)) return null;
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}
