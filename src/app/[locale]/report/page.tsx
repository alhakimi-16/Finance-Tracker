import type { Metadata } from "next";
import { Suspense } from "react";
import { Gate, Loading } from "@/components/Gate";
import { Report } from "@/components/Report";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata({ params }: PageProps<"/[locale]/report">): Promise<Metadata> {
  const { locale } = await params;
  return hasLocale(locale) ? { title: `${getDictionary(locale).nav.reports} · VJSD7` } : {};
}

export default function ReportPage() {
  return (
    <Gate>
      {/* the chosen period comes from the link (?period=…), which is only known in the browser */}
      <Suspense fallback={<Loading />}>
        <Report />
      </Suspense>
    </Gate>
  );
}
