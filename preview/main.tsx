import { FlaskConical } from "lucide-react";
import { Suspense, useLayoutEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Account } from "@/components/Account";
import { AppShell } from "@/components/AppShell";
import { FinanceProvider } from "@/components/FinanceProvider";
import { AdminOnly, Gate, Loading } from "@/components/Gate";
import { Login } from "@/components/Login";
import { Overview } from "@/components/Overview";
import { Report } from "@/components/Report";
import { localeInfo, type Locale } from "@/i18n/config";
import { DEMO_PASSWORD } from "./demo-backend";
import { RouterContext, type PreviewRouter } from "./router";

/**
 * The test version: the real pages and components, with the page kept in memory and a
 * database that lives only in this browser tab (see demo-backend.ts). Built by build.mjs.
 */

const banner: Record<Locale, { title: string; text: string; login: string; note: string; print: string }> = {
  de: {
    title: "Testversion",
    text: "Nichts wird gespeichert: Neu laden setzt alles auf 0 € zurück.",
    login: "Anmelden mit beliebiger E-Mail und dem Passwort",
    note: "Drucken, PDF und Link kopieren gehen erst auf der echten Seite.",
    print:
      "In der Testversion kann nicht gedruckt werden. Auf der echten Seite öffnet sich hier das Druckfenster, in dem du auch „Als PDF speichern“ wählen kannst.",
  },
  ar: {
    title: "نسخة تجريبية",
    text: "لا يُحفظ أي شيء: إعادة تحميل الصفحة تُرجع كل شيء إلى 0 €.",
    login: "سجّل الدخول بأي بريد إلكتروني وكلمة المرور",
    note: "الطباعة وملف PDF ونسخ الرابط تعمل فقط في الموقع الحقيقي.",
    print:
      "لا يمكن الطباعة في النسخة التجريبية. في الموقع الحقيقي تُفتح هنا نافذة الطباعة، ويمكنك منها أيضًا الحفظ كملف PDF.",
  },
};

function Banner({ locale }: { locale: Locale }) {
  const b = banner[locale];
  return (
    <div className="border-b border-gold-200 bg-gold-50 px-4 py-2.5 text-sm text-ink-soft print:hidden">
      <p className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 sm:px-2">
        <span className="inline-flex items-center gap-1.5 font-black text-gold-700">
          <FlaskConical aria-hidden className="size-4" />
          {b.title}
        </span>
        <span>{b.text}</span>
        <span>
          {b.login}{" "}
          <code dir="ltr" className="rounded-md bg-card px-1.5 py-0.5 font-bold text-ink ring-1 ring-line">
            {DEMO_PASSWORD}
          </code>
        </span>
        <span className="text-muted">{b.note}</span>
      </p>
    </div>
  );
}

function PreviewApp() {
  const [href, setHref] = useState("/de");
  const [printNotice, setPrintNotice] = useState(false);
  const locale: Locale = href.startsWith("/ar") ? "ar" : "de";
  const router = useMemo<PreviewRouter>(
    () => ({
      href,
      navigate: (next) => {
        setHref(next);
        window.scrollTo(0, 0);
      },
      replace: (next) => setHref(next),
    }),
    [href],
  );

  useLayoutEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = localeInfo[locale].dir;
  }, [locale]);

  // the artifact viewer cannot open the print dialog, so the print button explains that instead
  useLayoutEffect(() => {
    window.print = () => setPrintNotice(true);
  }, []);

  const path = href.split("?")[0];
  const page = path.endsWith("/report") ? (
    <Gate>
      <Suspense fallback={<Loading />}>
        <Report />
      </Suspense>
    </Gate>
  ) : path.endsWith("/login") ? (
    <Login />
  ) : path.endsWith("/account") ? (
    <AdminOnly>
      <Account />
    </AdminOnly>
  ) : (
    <Gate>
      <Overview />
    </Gate>
  );

  return (
    <RouterContext value={router}>
      <FinanceProvider locale={locale}>
        <Banner locale={locale} />
        <AppShell>{page}</AppShell>
        {printNotice && (
          <div role="alert" className="fixed inset-x-0 bottom-6 z-20 flex justify-center px-4">
            <p className="flex max-w-lg items-start gap-3 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-paper shadow-lg">
              <span>{banner[locale].print}</span>
              <button type="button" onClick={() => setPrintNotice(false)} className="shrink-0 font-black underline">
                OK
              </button>
            </p>
          </div>
        )}
      </FinanceProvider>
    </RouterContext>
  );
}

const root = document.getElementById("app");
if (root) createRoot(root).render(<PreviewApp />);
