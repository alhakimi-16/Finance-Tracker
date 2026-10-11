import type { Metadata } from "next";
import { Gate } from "@/components/Gate";
import { Members } from "@/components/Members";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata({ params }: PageProps<"/[locale]/members">): Promise<Metadata> {
  const { locale } = await params;
  return hasLocale(locale) ? { title: `${getDictionary(locale).members.title} · VJSD7` } : {};
}

export default function MembersPage() {
  return (
    <Gate>
      <Members />
    </Gate>
  );
}
