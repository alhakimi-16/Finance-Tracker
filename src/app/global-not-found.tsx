import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { cairo } from "./fonts";
import { getDictionary } from "@/i18n/dictionaries";

export const metadata: Metadata = {
  title: "404",
  robots: { index: false, follow: false },
};

/** For URLs outside /de and /ar: one page in both languages. */
export default function GlobalNotFound() {
  const de = getDictionary("de");
  const ar = getDictionary("ar");
  return (
    <html lang="de" className={cairo.variable}>
      <body className="grid min-h-dvh place-items-center p-6 antialiased">
        <main className="max-w-md text-center">
          <p className="text-6xl font-black text-gold-500">404</p>
          <h1 className="mt-4 text-2xl font-bold">{de.notFound.title}</h1>
          <p dir="rtl" lang="ar" className="mt-1 text-2xl font-bold">
            {ar.notFound.title}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/de" className="rounded-full bg-gold-600 px-5 py-2.5 font-bold text-white hover:bg-gold-700">
              {de.notFound.back}
            </Link>
            <Link
              href="/ar"
              lang="ar"
              dir="rtl"
              className="rounded-full bg-gold-600 px-5 py-2.5 font-bold text-white hover:bg-gold-700"
            >
              {ar.notFound.back}
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
