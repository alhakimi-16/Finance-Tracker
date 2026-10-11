"use client";

import { KeyRound, ShieldCheck, Trash2, UserPlus, UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { fill } from "@/i18n/format";
import { addAdmin, changePassword, fetchAdmins, removeAdmin } from "@/lib/backend";
import { formatTimestamp } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import type { Admin } from "@/lib/types";
import { errorText, useFinance } from "./FinanceProvider";
import { Modal } from "./Modal";
import { btn, card, cx, field, iconButtonDanger, label, pill } from "./ui";

/** For admins: who else may edit, and their own password. */
export function Account() {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <AdminList />
      <MyAccount />
    </div>
  );
}

function AdminList() {
  const { locale, t, account } = useFinance();
  const a = t.accountPage;
  const [admins, setAdmins] = useState<Admin[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Admin | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAdmins().then(
      (list) => !cancelled && setAdmins(list),
      () => !cancelled && setLoadError(true),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setMessage(a.invalidEmail);
    if (admins?.some((admin) => admin.email === email)) return setMessage(a.exists);
    setBusy(true);
    setMessage(null);
    try {
      const added = await addAdmin(email);
      setAdmins((list) => [...(list ?? []), added]);
      setNewEmail("");
    } catch (error) {
      setMessage(error instanceof AppError && error.kind === "exists" ? a.exists : errorText(error, t));
    }
    setBusy(false);
  }

  return (
    <section className={cx(card, "p-6 sm:p-8")}>
      <h1 className="flex items-center gap-2 text-3xl font-black">
        <ShieldCheck aria-hidden className="size-7 text-gold-700" />
        {a.adminsTitle}
      </h1>
      <p className="mt-3 text-ink-soft">{a.adminsIntro}</p>

      {loadError ? (
        <p role="alert" className="mt-6 rounded-2xl bg-expense-soft px-4 py-3 font-semibold text-expense">
          {a.loadError}
        </p>
      ) : !admins ? (
        <p className="mt-6 text-muted">{t.common.loading}</p>
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-field">
          {admins.map((admin) => {
            const isMe = admin.email === account?.email.toLowerCase();
            return (
              <li key={admin.email} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p dir="ltr" className="truncate font-bold text-ink rtl:text-right">
                    {admin.email}
                  </p>
                  <p className="text-xs text-muted">
                    {a.since} {formatTimestamp(admin.createdAt, locale)}
                  </p>
                </div>
                {isMe ? (
                  <span className="rounded-full bg-gold-50 px-3 py-1 text-sm font-bold text-gold-700 ring-1 ring-gold-200 ring-inset">
                    {a.you}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setRemoving(admin)}
                    aria-label={fill(a.removeLabel, { email: admin.email })}
                    title={a.remove}
                    className={iconButtonDanger}
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={onAdd} noValidate className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <label htmlFor="admin-email" className={label}>
            {a.email}
          </label>
          <input
            id="admin-email"
            type="email"
            dir="ltr"
            autoComplete="off"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className={cx(field, "rtl:text-right")}
          />
        </div>
        <button type="submit" disabled={busy || !admins} className={btn("gold")}>
          <UserPlus aria-hidden className="size-4" />
          {busy ? a.adding : a.add}
        </button>
      </form>
      {message && (
        <p role="alert" className="mt-3 rounded-2xl bg-expense-soft px-4 py-2.5 text-sm font-semibold text-expense">
          {message}
        </p>
      )}

      <div className="mt-6 rounded-2xl bg-gold-50 p-4 text-sm text-ink-soft ring-1 ring-gold-200 ring-inset">
        <p className="font-bold text-ink">{a.howToTitle}</p>
        <ol className="mt-2 list-decimal space-y-1 ps-5">
          {a.howTo.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      <Modal open={removing !== null} onClose={() => setRemoving(null)} title={a.remove} closeLabel={t.common.close} size="sm">
        {removing && (
          <ConfirmRemove
            admin={removing}
            onCancel={() => setRemoving(null)}
            onConfirm={async () => {
              await removeAdmin(removing.email);
              setAdmins((list) => list?.filter((x) => x.email !== removing.email) ?? null);
              setRemoving(null);
            }}
          />
        )}
      </Modal>
    </section>
  );
}

function ConfirmRemove({
  admin,
  onCancel,
  onConfirm,
}: {
  admin: Admin;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const { t } = useFinance();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
    } catch (e) {
      setError(errorText(e, t));
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-ink-soft">{fill(t.accountPage.removeConfirm, { email: `⁦${admin.email}⁩` })}</p>
      {error && (
        <p role="alert" className="mt-4 rounded-2xl bg-expense-soft px-4 py-2.5 text-sm font-semibold text-expense">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onCancel} className={btn("quiet")} data-autofocus>
          {t.common.cancel}
        </button>
        <button type="button" onClick={() => void confirm()} disabled={busy} className={btn("expense")}>
          {t.accountPage.remove}
        </button>
      </div>
    </div>
  );
}

function MyAccount() {
  const { t, account } = useFinance();
  const p = t.accountPage.password;
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 8) return setResult({ ok: false, text: p.tooShort });
    if (password !== repeat) return setResult({ ok: false, text: p.mismatch });
    setBusy(true);
    const problem = await changePassword(password);
    setBusy(false);
    if (problem) {
      setResult({ ok: false, text: fill(p.failed, { reason: problem }) });
    } else {
      setResult({ ok: true, text: p.done });
      setPassword("");
      setRepeat("");
    }
  }

  return (
    <section className={cx(card, "p-6 sm:p-8")}>
      <h2 className={pill}>
        <UserRound aria-hidden className="size-4" />
        {t.accountPage.myAccount}
      </h2>
      <p dir="ltr" className="mt-4 font-bold break-all text-ink rtl:text-right">
        {account?.email}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <h3 className="flex items-center gap-2 font-black">
          <KeyRound aria-hidden className="size-4 text-gold-700" />
          {p.title}
        </h3>
        <div>
          <label htmlFor="new-password" className={label}>
            {p.new}
          </label>
          <input
            id="new-password"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={cx(field, "rtl:text-right")}
          />
        </div>
        <div>
          <label htmlFor="repeat-password" className={label}>
            {p.repeat}
          </label>
          <input
            id="repeat-password"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            className={cx(field, "rtl:text-right")}
          />
        </div>
        {result && (
          <p
            role={result.ok ? "status" : "alert"}
            className={cx(
              "rounded-2xl px-4 py-2.5 text-sm font-semibold",
              result.ok ? "bg-income-soft text-income" : "bg-expense-soft text-expense",
            )}
          >
            {result.text}
          </p>
        )}
        <button type="submit" disabled={busy} className={btn("gold")}>
          {p.submit}
        </button>
      </form>
    </section>
  );
}
