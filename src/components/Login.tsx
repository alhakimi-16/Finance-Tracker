"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { fill } from "@/i18n/format";
import { useFinance } from "./FinanceProvider";
import { Loading, LoginCard, NotAdmin } from "./Gate";
import { btn, card, cx } from "./ui";

/** The login page for the finance officer; after signing in it returns to the overview. */
export function Login() {
  const { locale, t, account, viewer } = useFinance();
  const router = useRouter();

  if (account === undefined) return <Loading />;
  if (account === null) return <LoginCard onSignedIn={() => router.push(`/${locale}`)} />;
  if (viewer === undefined) return <Loading />;
  if (viewer !== "admin") return <NotAdmin />;
  return (
    <section className={cx(card, "mx-auto max-w-md p-6 text-center sm:p-8")}>
      <p className="text-ink-soft">{fill(t.login.signedIn, { email: account.email })}</p>
      <Link href={`/${locale}`} className={cx(btn("gold"), "mt-5")}>
        {t.login.back}
      </Link>
    </section>
  );
}
