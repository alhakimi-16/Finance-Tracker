import type { Metadata } from "next";
import { Account } from "@/components/Account";
import { AdminOnly } from "@/components/Gate";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata({ params }: PageProps<"/[locale]/account">): Promise<Metadata> {
  const { locale } = await params;
  return hasLocale(locale) ? { title: `${getDictionary(locale).accountPage.title} · VJSD7` } : {};
}

export default function AccountPage() {
  return (
    <AdminOnly>
      <Account />
    </AdminOnly>
  );
}
