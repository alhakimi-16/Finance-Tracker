import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { cairo } from "../fonts";
import { AppShell } from "@/components/AppShell";
import { FinanceProvider } from "@/components/FinanceProvider";
import { InlineScript } from "@/components/InlineScript";
import { hasLocale, localeInfo, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { bootScript } from "@/lib/boot";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = getDictionary(locale);
  return {
    title: t.meta.title,
    description: t.meta.description,
    // a private tool: keep it out of search engines
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f1eb" },
    { media: "(prefers-color-scheme: dark)", color: "#15130f" },
  ],
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  return (
    // the boot script sets data-theme on <html> (saved light/dark choice) before React hydrates
    <html lang={locale} dir={localeInfo[locale].dir} className={cairo.variable} suppressHydrationWarning>
      <head>
        <InlineScript html={bootScript} />
      </head>
      <body className="antialiased">
        <FinanceProvider locale={locale}>
          <AppShell>{children}</AppShell>
        </FinanceProvider>
      </body>
    </html>
  );
}
