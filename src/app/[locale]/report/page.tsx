import type { Metadata } from "next";
import { Gate } from "@/components/Gate";
import { Report } from "@/components/Report";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata({ params }: PageProps<"/[locale]/report">): Promise<Metadata> {
  const { locale } = await params;
  return hasLocale(locale) ? { title: `${getDictionary(locale).report.title} · VJSD7` } : {};
}

export default function ReportPage() {
  return (
    <Gate>
      <Report />
    </Gate>
  );
}
