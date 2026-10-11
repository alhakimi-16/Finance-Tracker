"use client";

import { Bookmark, LogOut, Send } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useFinance } from "./FinanceProvider";
import { LangSwitch } from "./LangSwitch";
import { cx } from "./ui";

export function AppShell({ children }: { children: ReactNode }) {
  const { locale, t, status, email, role, signOut } = useFinance();
  const pathname = usePathname();
  const base = `/${locale}`;
  const links = [
    { href: base, label: t.nav.overview },
    { href: `${base}/report`, label: t.nav.report },
    { href: `${base}/members`, label: t.nav.members },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto w-full max-w-6xl px-4 pt-5 sm:px-6 sm:pt-8 print:hidden">
        <div className="flex items-start justify-between gap-3">
          <Link href={base} className="flex min-w-0 items-center gap-3 sm:gap-5">
            <Image
              src="/logo.png"
              alt={t.brand.logoAlt}
              width={148}
              height={182}
              priority
              className="h-16 w-auto shrink-0 sm:h-24"
            />
            <span className="min-w-0">
              <span className="block text-xs leading-snug font-semibold text-gold-700 sm:text-base">
                {t.brand.kicker}
              </span>
              <span className="block text-2xl leading-tight font-black tracking-tight text-ink sm:text-5xl">
                {t.brand.title}
              </span>
            </span>
          </Link>
          <LangSwitch locale={locale} label={t.language} />
        </div>

        {status === "ready" && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 sm:mt-7">
            <nav aria-label={t.nav.label} className="-mx-1 flex gap-1 overflow-x-auto px-1">
              {links.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "rounded-full px-4 py-1.5 text-sm font-bold whitespace-nowrap transition-colors sm:text-base",
                      active ? "bg-gold-600 text-white" : "text-gold-700 hover:bg-gold-100",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="min-w-0 truncate text-muted" title={`${t.account.label} ${email ?? ""}`}>
                {email}
              </span>
              {role && (
                <span className="shrink-0 rounded-full border border-gold-300 bg-gold-50 px-2.5 py-0.5 text-xs font-bold text-gold-700">
                  {t.roles[role]}
                </span>
              )}
              <button
                type="button"
                onClick={() => void signOut()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-bold text-ink-soft transition-colors hover:bg-gold-100 hover:text-ink"
              >
                <LogOut aria-hidden className="size-4 rtl:-scale-x-100" />
                <span className="max-sm:sr-only">{t.account.signOut}</span>
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>

      <footer className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 pt-4 pb-8 sm:px-6 print:hidden">
        <p className="text-sm font-semibold text-gold-700 sm:text-lg">{t.brand.footer}</p>
        <span aria-hidden className="flex shrink-0 items-center gap-3 text-gold-500">
          <Send className="size-5 fill-current rtl:-scale-x-100" strokeWidth={1.5} />
          <Bookmark className="size-5 fill-current" strokeWidth={1.5} />
        </span>
      </footer>
    </div>
  );
}

/** The long gold arrow from the poster, pointing in reading direction. */
export function GoldArrow({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 160 14" fill="none" className={cx("h-3.5 rtl:-scale-x-100", className)}>
      <path d="M1 7h150" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M147 1.5 158 7l-11 5.5z" fill="currentColor" />
    </svg>
  );
}
