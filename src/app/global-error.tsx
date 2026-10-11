"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import "./globals.css";
import { cairo } from "./fonts";
import { ErrorDetails } from "@/components/ErrorDetails";
import { btn, cx } from "@/components/ui";
import { getDictionary } from "@/i18n/dictionaries";

/**
 * Replaces the whole page when something fails outside a single page, for example while connecting to the
 * database. Which language was open is not known here, so it speaks both, like the 404 page.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  const de = getDictionary("de");
  const ar = getDictionary("ar");

  // this page brings its own <html>, so the saved light/dark choice has to be applied again
  useEffect(() => {
    try {
      const theme = localStorage.getItem("theme");
      if (theme === "light" || theme === "dark") document.documentElement.setAttribute("data-theme", theme);
    } catch {
      // storage blocked: the system setting applies
    }
  }, []);

  return (
    <html lang="de" className={cairo.variable}>
      <body className="grid min-h-dvh place-items-center p-6 antialiased">
        <title>{`${de.crash.title} · ${ar.crash.title}`}</title>
        <main className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold">{de.crash.title}</h1>
          <p className="mt-2 text-ink-soft">{de.crash.body}</p>
          <p dir="rtl" lang="ar" className="mt-6 text-2xl font-bold">
            {ar.crash.title}
          </p>
          <p dir="rtl" lang="ar" className="mt-2 text-ink-soft">
            {ar.crash.body}
          </p>
          <ErrorDetails error={error} />
          <button type="button" onClick={() => window.location.reload()} className={cx(btn("gold"), "mt-6")}>
            <RotateCcw aria-hidden className="size-4" />
            {de.common.retry} · <span lang="ar">{ar.common.retry}</span>
          </button>
        </main>
      </body>
    </html>
  );
}
