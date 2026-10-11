import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { cairo } from "../fonts";
import { AppShell } from "@/components/AppShell";
import { FinanceProvider } from "@/components/FinanceProvider";
import { hasLocale, localeInfo, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

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
  themeColor: "#f3f1eb",
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  return (
    <html lang={locale} dir={localeInfo[locale].dir} className={cairo.variable}>
      <body className="antialiased">
        <FinanceProvider locale={locale}>
          <AppShell>{children}</AppShell>
        </FinanceProvider>
      </body>
    </html>
  );
}
