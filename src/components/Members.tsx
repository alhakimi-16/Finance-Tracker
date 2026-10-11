"use client";

import { KeyRound, Trash2, UserPlus, UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { fill } from "@/i18n/format";
import { addMember, AppError, fetchMembers, removeMember, setMemberRole } from "@/lib/api";
import { formatTimestamp } from "@/lib/dates";
import type { Member, Role } from "@/lib/types";
import { errorText, useFinance } from "./FinanceProvider";
import { Modal } from "./Modal";
import { btn, card, cx, field, fieldLook, iconButtonDanger, label, pill } from "./ui";

const roles: Role[] = ["admin", "viewer"];

/** Admins manage who may sign in; everyone can change their own password here. */
export function Members() {
  const { t, canEdit } = useFinance();
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      {canEdit ? (
        <AccessList />
      ) : (
        <section className={cx(card, "p-6 sm:p-8")}>
          <h1 className="text-3xl font-black">{t.members.title}</h1>
          <p className="mt-3 text-ink-soft">{t.members.intro}</p>
        </section>
      )}
      <MyAccount />
    </div>
  );
}

function AccessList() {
  const { locale, t, client, email: myEmail } = useFinance();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("viewer");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    fetchMembers(client).then(
      (list) => !cancelled && setMembers(list),
      () => !cancelled && setLoadError(true),
    );
    return () => {
      cancelled = true;
    };
  }, [client]);

  function explain(error: unknown) {
    return error instanceof AppError ? errorText(error, t) : t.errors.unknown;
  }

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    if (!client) return;
    const email = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage(t.members.invalidEmail);
      return;
    }
    if (members?.some((member) => member.email === email)) {
      setMessage(t.members.exists);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const added = await addMember(client, email, newRole);
      setMembers((list) => [...(list ?? []), added]);
      setNewEmail("");
    } catch (error) {
      setMessage(error instanceof AppError && error.kind === "exists" ? t.members.exists : explain(error));
    }
    setBusy(false);
  }

  async function onRoleChange(member: Member, role: Role) {
    if (!client) return;
    setMessage(null);
    try {
      await setMemberRole(client, member.email, role);
      setMembers((list) => list?.map((m) => (m.email === member.email ? { ...m, role } : m)) ?? null);
    } catch (error) {
      setMessage(explain(error));
    }
  }

  return (
    <section className={cx(card, "p-6 sm:p-8")}>
      <h1 className="text-3xl font-black">{t.members.title}</h1>
      <p className="mt-3 text-ink-soft">{t.members.intro}</p>

      {loadError ? (
        <p role="alert" className="mt-6 rounded-2xl bg-expense-soft px-4 py-3 font-semibold text-expense">
          {t.members.loadError}
        </p>
      ) : !members ? (
        <p className="mt-6 text-muted">{t.common.loading}</p>
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-white">
          {members.map((member) => {
            const isMe = member.email === myEmail?.toLowerCase();
            return (
              <li key={member.email} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p dir="ltr" className="truncate font-bold text-ink rtl:text-right">
                    {member.email}
                  </p>
                  <p className="text-xs text-muted">
                    {t.members.since} {formatTimestamp(member.createdAt, locale)}
                  </p>
                </div>
                {isMe ? (
                  <span className="rounded-full bg-gold-50 px-3 py-1 text-sm font-bold text-gold-700 ring-1 ring-gold-200 ring-inset">
                    {t.roles[member.role]} · {t.members.you}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <select
                      value={member.role}
                      onChange={(e) => void onRoleChange(member, e.target.value as Role)}
                      aria-label={fill(t.members.roleLabel, { email: member.email })}
                      className={cx(fieldLook, "h-9 px-3 text-sm")}
                    >
                      {roles.map((role) => (
                        <option key={role} value={role}>
                          {t.roles[role]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setRemoving(member)}
                      aria-label={fill(t.members.removeLabel, { email: member.email })}
                      title={t.members.remove}
                      className={iconButtonDanger}
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={onAdd} noValidate className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
        <div>
          <label htmlFor="member-email" className={label}>
            {t.members.email}
          </label>
          <input
            id="member-email"
            type="email"
            dir="ltr"
            autoComplete="off"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className={cx(field, "rtl:text-right")}
          />
        </div>
        <div>
          <label htmlFor="member-role" className={label}>
            {t.members.role}
          </label>
          <select
            id="member-role"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as Role)}
            className={cx(field, "sm:w-auto")}
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {t.roles[role]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={busy || !members} className={btn("gold")}>
          <UserPlus aria-hidden className="size-4" />
          {busy ? t.members.adding : t.members.add}
        </button>
      </form>
      {message && (
        <p role="alert" className="mt-3 rounded-2xl bg-expense-soft px-4 py-2.5 text-sm font-semibold text-expense">
          {message}
        </p>
      )}

      <div className="mt-6 rounded-2xl bg-gold-50 p-4 text-sm text-ink-soft ring-1 ring-gold-200 ring-inset">
        <p className="font-bold text-ink">{t.members.howToTitle}</p>
        <ol className="mt-2 list-decimal space-y-1 ps-5">
          {t.members.howTo.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={t.members.remove}
        closeLabel={t.common.close}
        size="sm"
      >
        {removing && (
          <ConfirmRemove
            member={removing}
            onCancel={() => setRemoving(null)}
            onConfirm={async () => {
              if (!client) return;
              await removeMember(client, removing.email);
              setMembers((list) => list?.filter((m) => m.email !== removing.email) ?? null);
              setRemoving(null);
            }}
          />
        )}
      </Modal>
    </section>
  );
}

function ConfirmRemove({
  member,
  onCancel,
  onConfirm,
}: {
  member: Member;
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
      setError(e instanceof AppError ? errorText(e, t) : t.errors.unknown);
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-ink-soft">{fill(t.members.removeConfirm, { email: `⁦${member.email}⁩` })}</p>
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
          {t.members.remove}
        </button>
      </div>
    </div>
  );
}

function MyAccount() {
  const { t, client, email, role } = useFinance();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!client) return;
    if (password.length < 8) return setResult({ ok: false, text: t.members.password.tooShort });
    if (password !== repeat) return setResult({ ok: false, text: t.members.password.mismatch });
    setBusy(true);
    const { error } = await client.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setResult({ ok: false, text: fill(t.members.password.failed, { reason: error.message }) });
    } else {
      setResult({ ok: true, text: t.members.password.done });
      setPassword("");
      setRepeat("");
    }
  }

  return (
    <section className={cx(card, "p-6 sm:p-8")}>
      <h2 className={pill}>
        <UserRound aria-hidden className="size-4" />
        {t.members.myAccount}
      </h2>
      <p dir="ltr" className="mt-4 font-bold break-all text-ink rtl:text-right">
        {email}
      </p>
      {role && <p className="text-sm text-muted">{t.roles[role]}</p>}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <h3 className="flex items-center gap-2 font-black">
          <KeyRound aria-hidden className="size-4 text-gold-700" />
          {t.members.password.title}
        </h3>
        <div>
          <label htmlFor="new-password" className={label}>
            {t.members.password.new}
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
            {t.members.password.repeat}
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
          {t.members.password.submit}
        </button>
      </form>
    </section>
  );
}
