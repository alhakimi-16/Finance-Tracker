import { localeInfo, type Locale } from "./config";
import type { Plural } from "./dictionaries";

/** Replaces {name} placeholders: fill("Stand {date}", { date: "…" }). */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}

const pluralRules = new Map<Locale, Intl.PluralRules>();

/** Picks the right plural form (Arabic has six) and fills in {n}. */
export function plural(locale: Locale, count: number, forms: Plural): string {
  let rules = pluralRules.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(localeInfo[locale].intl);
    pluralRules.set(locale, rules);
  }
  return fill(forms[rules.select(count)] ?? forms.other, { n: count });
}
