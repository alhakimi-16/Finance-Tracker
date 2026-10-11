"use client";

import { Database, Lock, LogOut, ShieldAlert } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { fill } from "@/i18n/format";
import { useFinance } from "./FinanceProvider";
import { btn, card, cx, field, label, pill } from "./ui";

/** Shows the page only when someone with access is signed in; otherwise the matching screen. */
export function Gate({ children }: { children: ReactNode }) {
  const { status } = useFinance();
  switch (status) {
    case "ready":
      return children;
    case "loading":
      return <Loading />;
    case "unconfigured":
      return <Setup />;
    case "signed-out":
      return <Login />;
    case "role-error":
      return <RoleError />;
    case "no-access":
      return <NoAccess />;
  }
}

export function Loading() {
  const { t } = useFinance();
  return (
    <div role="status" className="grid place-items-center py-24 text-muted">
      <span className="flex items-center gap-3">
        <span className="size-5 animate-spin rounded-full border-2 border-gold-200 border-t-gold-600" />
        {t.common.loading}
      </span>
    </div>
  );
}

function Panel({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className={cx(card, "mx-auto max-w-lg p-6 sm:p-8")}>
      <span className="mb-4 inline-grid size-12 place-items-center rounded-2xl bg-gold-100 text-gold-700">{icon}</span>
      <h1 className="text-2xl font-black text-ink">{title}</h1>
      <div className="mt-3 text-ink-soft">{children}</div>
    </section>
  );
}

function Login() {
  const { t, signIn } = useFinance();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await signIn(email, password);
    if (result !== "ok") {
      setError(result === "wrong" ? t.login.wrongCredentials : t.login.failed);
      setBusy(false);
    }
  }

  return (
    <section className={cx(card, "mx-auto max-w-md p-6 sm:p-8")}>
      <span className={pill}>
        <Lock aria-hidden className="size-4" />
        {t.login.title}
      </span>
      <p className="mt-4 text-ink-soft">{t.login.intro}</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="login-email" className={label}>
            {t.login.email}
          </label>
          <input
            id="login-email"
            type="email"
            dir="ltr"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={cx(field, "rtl:text-right")}
          />
        </div>
        <div>
          <label htmlFor="login-password" className={label}>
            {t.login.password}
          </label>
          <input
            id="login-password"
            type="password"
            dir="ltr"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={cx(field, "rtl:text-right")}
          />
        </div>
        {error && (
          <p role="alert" className="rounded-2xl bg-expense-soft px-4 py-2.5 text-sm font-semibold text-expense">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className={cx(btn("gold", "lg"), "w-full")}>
          {busy ? t.login.submitting : t.login.submit}
        </button>
      </form>
    </section>
  );
}

function Setup() {
  const { t } = useFinance();
  return (
    <Panel icon={<Database aria-hidden className="size-6" />} title={t.setup.title}>
      <p>{t.setup.body}</p>
      <ol className="mt-4 list-decimal space-y-2 ps-5">
        {t.setup.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </Panel>
  );
}

function NoAccess() {
  const { t, email, signOut } = useFinance();
  return (
    <Panel icon={<ShieldAlert aria-hidden className="size-6" />} title={t.noAccess.title}>
      <p>{fill(t.noAccess.body, { email: email ?? "" })}</p>
      <button type="button" onClick={() => void signOut()} className={cx(btn("quiet"), "mt-6")}>
        <LogOut aria-hidden className="size-4 rtl:-scale-x-100" />
        {t.account.signOut}
      </button>
    </Panel>
  );
}

function RoleError() {
  const { t, retryRole, signOut } = useFinance();
  return (
    <Panel icon={<ShieldAlert aria-hidden className="size-6" />} title={t.noAccess.roleError}>
      <p>{t.errors.network}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={retryRole} className={btn("gold")}>
          {t.common.retry}
        </button>
        <button type="button" onClick={() => void signOut()} className={btn("quiet")}>
          {t.account.signOut}
        </button>
      </div>
    </Panel>
  );
}
