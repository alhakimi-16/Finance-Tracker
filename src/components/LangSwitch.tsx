"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeInfo, locales, type Locale } from "@/i18n/config";

/** DE | عربي — keeps the current page when switching. */
export function LangSwitch({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname() ?? `/${locale}`;
  const rest = pathname.split("/").slice(2).join("/");

  return (
    <div role="group" aria-label={label} className="flex items-center rounded-full bg-ink/[0.06] p-1 text-sm font-bold">
      {locales.map((code) =>
        code === locale ? (
          <span key={code} aria-current="true" className="rounded-full bg-card px-3 py-0.5 text-ink shadow-sm">
            {localeInfo[code].short}
          </span>
        ) : (
          <Link
            key={code}
            href={`/${code}${rest ? `/${rest}` : ""}`}
            hrefLang={code}
            lang={code}
            aria-label={localeInfo[code].name}
            className="rounded-full px-3 py-0.5 text-muted transition-colors hover:text-ink"
          >
            {localeInfo[code].short}
          </Link>
        ),
      )}
    </div>
  );
}
