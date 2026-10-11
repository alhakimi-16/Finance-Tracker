import type { Locale } from "@/i18n/config";
import { formatEuro } from "@/lib/money";
import type { Kind } from "@/lib/types";
import { cx } from "./ui";

/**
 * An amount in euros, always laid out left-to-right (also inside Arabic text).
 * - with `kind`: income is green "+12,50 €", an expense red "−12,50 €"
 * - with `signed`: the sign of `cents` decides (+ green / − red)
 * - otherwise: plain, only negative amounts turn red
 */
export function Money({
  cents,
  locale,
  kind,
  signed = false,
  colored = true,
  className,
}: {
  cents: number;
  locale: Locale;
  kind?: Kind;
  signed?: boolean;
  colored?: boolean;
  className?: string;
}) {
  const value = kind === "expense" ? -Math.abs(cents) : kind === "income" ? Math.abs(cents) : cents;
  const showSign = kind !== undefined || signed;
  const color = !colored || value === 0 ? undefined : value < 0 ? "text-expense" : showSign ? "text-income" : undefined;
  return (
    <bdi dir="ltr" className={cx("whitespace-nowrap", color, className)}>
      {formatEuro(value, locale, showSign ? "always" : "auto")}
    </bdi>
  );
}
