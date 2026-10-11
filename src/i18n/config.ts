export const locales = ["de", "ar"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "de";

export const localeInfo: Record<Locale, { name: string; short: string; dir: "ltr" | "rtl"; intl: string }> = {
  de: { name: "Deutsch", short: "DE", dir: "ltr", intl: "de-DE" },
  // Western digits in Arabic too, so amounts look the same as on the PayPal statement
  ar: { name: "العربية", short: "عربي", dir: "rtl", intl: "ar-u-nu-latn" },
};

export function hasLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
