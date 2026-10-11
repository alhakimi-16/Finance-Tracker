import type { Metadata } from "next";
import { Login } from "@/components/Login";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata({ params }: PageProps<"/[locale]/login">): Promise<Metadata> {
  const { locale } = await params;
  return hasLocale(locale) ? { title: `${getDictionary(locale).login.title} · VJSD7` } : {};
}

export default function LoginPage() {
  return <Login />;
}
