"use client";

import { ArrowDownLeft, ArrowUpRight, Minus, Plus, TriangleAlert, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fill, plural } from "@/i18n/format";
import { formatDate, periodRange, quarterOf, todayIso } from "@/lib/dates";
import { inRange, runningBalances, totals } from "@/lib/ledger";
import { formatEuro } from "@/lib/money";
import type { Entry, Kind } from "@/lib/types";
import { GoldArrow } from "./AppShell";
import { EntriesSection } from "./EntriesSection";
import { EntryForm } from "./EntryForm";
import { errorText, useFinance } from "./FinanceProvider";
import { Loading } from "./Gate";
import { Modal } from "./Modal";
import { Money } from "./Money";
import { btn, card, cx, pill } from "./ui";

type Editing = { kind: Kind; entry?: Entry } | null;

export function Overview() {
  const { locale, t, account, viewer, entries, entriesLoaded, entriesError, canEdit, reloadEntries, removeEntry } =
    useFinance();
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Entry | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const balances = useMemo(() => runningBalances(entries), [entries]);
  const all = useMemo(() => totals(entries), [entries]);

  // the highlighted row and the confirmation fade after a moment
  useEffect(() => {
    if (!flashId && !notice) return;
    const timer = setTimeout(() => {
      setFlashId(null);
      setNotice("");
    }, 3000);
    return () => clearTimeout(timer);
  }, [flashId, notice]);

  if (!entriesLoaded) return <Loading />;

  return (
    <>
      {viewer === "other" && (
        <p className="mb-6 rounded-2xl bg-gold-50 px-4 py-3 text-sm text-ink-soft ring-1 ring-gold-200 ring-inset">
          {fill(t.notAdmin.body, { email: account?.email ?? "" })}
        </p>
      )}
      {entriesError && (
        <div
          role="alert"
          className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl bg-expense-soft px-4 py-3 text-expense"
        >
          <TriangleAlert aria-hidden className="size-5 shrink-0" />
          <span className="font-semibold">
            {t.entries.loadError} {errorText(entriesError, t)}
          </span>
          <button
            type="button"
            onClick={() => void reloadEntries()}
            className="ms-auto font-bold underline underline-offset-4"
          >
            {t.common.retry}
          </button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="balance-title" className={cx(card, "relative overflow-hidden p-6 sm:p-8")}>
          <span aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-gold-500" />
          <h2 id="balance-title" className={pill}>
            <Wallet aria-hidden className="size-4" />
            {t.overview.balance}
          </h2>
          <p className="mt-4 text-5xl leading-none font-black tracking-tight sm:text-6xl">
            <Money cents={all.net} locale={locale} />
          </p>
          <p className="mt-3 text-sm text-muted">
            {entries.length > 0
              ? `${fill(t.overview.asOf, { date: formatDate(entries[0].date, locale, "long") })} · ${plural(locale, entries.length, t.overview.entries)}`
              : t.overview.noEntries}
          </p>
          {all.net < 0 && (
            <p className="mt-2 flex items-center gap-2 text-sm font-bold text-expense">
              <TriangleAlert aria-hidden className="size-4" />
              {t.overview.negative}
            </p>
          )}

          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-2xl bg-income-soft/70 px-4 py-3">
              <ArrowDownLeft aria-hidden className="size-5 shrink-0 text-income rtl:-scale-x-100" />
              <div>
                <dt className="text-xs font-semibold text-ink-soft">{t.overview.totalIncome}</dt>
                <dd className="text-lg font-black">
                  <Money cents={all.income} kind="income" locale={locale} />
                </dd>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-expense-soft/70 px-4 py-3">
              <ArrowUpRight aria-hidden className="size-5 shrink-0 text-expense rtl:-scale-x-100" />
              <div>
                <dt className="text-xs font-semibold text-ink-soft">{t.overview.totalExpense}</dt>
                <dd className="text-lg font-black">
                  <Money cents={all.expense} kind="expense" locale={locale} />
                </dd>
              </div>
            </div>
          </dl>

          {canEdit && (
            <div className="mt-6 grid gap-3 sm:flex">
              <button
                type="button"
                onClick={() => setEditing({ kind: "income" })}
                aria-label={t.overview.addIncomeLong}
                className={btn("income", "lg")}
              >
                <Plus aria-hidden className="size-5" strokeWidth={3} />
                {t.overview.addIncome}
              </button>
              <button
                type="button"
                onClick={() => setEditing({ kind: "expense" })}
                aria-label={t.overview.addExpenseLong}
                className={btn("expense", "lg")}
              >
                <Minus aria-hidden className="size-5" strokeWidth={3} />
                {t.overview.addExpense}
              </button>
            </div>
          )}
        </section>

        <QuarterCard entries={entries} />
      </div>

      <EntriesSection
        balances={balances}
        flashId={flashId}
        onEdit={(entry) => setEditing({ kind: entry.kind, entry })}
        onDelete={setDeleting}
      />

      <p role="status" aria-live="polite" className="sr-only">
        {notice}
      </p>
      {notice && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-10 flex justify-center px-4" aria-hidden>
          <span className="rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-paper shadow-lg">{notice}</span>
        </div>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.entry ? t.form.editTitle : t.form.newTitle}
        closeLabel={t.common.close}
      >
        {editing && (
          <EntryForm
            entry={editing.entry}
            initialKind={editing.kind}
            onCancel={() => setEditing(null)}
            onSaved={(saved) => {
              setEditing(null);
              setFlashId(saved.id);
              setNotice(t.entries.saved);
            }}
          />
        )}
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={t.form.deleteTitle}
        closeLabel={t.common.close}
        size="sm"
      >
        {deleting && (
          <ConfirmDelete
            entry={deleting}
            onCancel={() => setDeleting(null)}
            onConfirm={async () => {
              await removeEntry(deleting.id);
              setDeleting(null);
              setNotice(t.entries.deleted);
            }}
          />
        )}
      </Modal>
    </>
  );
}

function QuarterCard({ entries }: { entries: Entry[] }) {
  const { locale, t } = useFinance();
  const { year, quarter } = quarterOf(todayIso());
  const { start, end } = periodRange({ type: "quarter", year, quarter });
  const q = totals(inRange(entries, start, end));
  const largest = Math.max(q.income, q.expense);
  const width = (cents: number) => (largest > 0 ? `${Math.max((cents / largest) * 100, cents > 0 ? 2 : 0)}%` : "0%");

  return (
    <section aria-labelledby="quarter-title" className={cx(card, "flex flex-col p-6 sm:p-8")}>
      <h2 id="quarter-title" className="text-xl font-black">
        {fill(t.overview.quarterTitle, { quarter: `${t.report.quartersShort[quarter - 1]} ${year}` })}
      </h2>
      <p className="text-sm text-muted">
        {formatDate(start, locale)} – {formatDate(end, locale)}
      </p>
      {/* income and expenses as two bars on one scale */}
      <dl className="mt-5 space-y-4">
        <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-4">
          <dt className="text-ink-soft">{t.report.income}</dt>
          <dd className="font-bold tabular-nums">
            <Money cents={q.income} kind="income" locale={locale} />
          </dd>
          <dd aria-hidden className="col-span-2 mt-1.5 h-2 rounded-full bg-income-soft">
            <span className="block h-full rounded-full bg-income" style={{ width: width(q.income) }} />
          </dd>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-4">
          <dt className="text-ink-soft">{t.report.expense}</dt>
          <dd className="font-bold tabular-nums">
            <Money cents={q.expense} kind="expense" locale={locale} />
          </dd>
          <dd aria-hidden className="col-span-2 mt-1.5 h-2 rounded-full bg-expense-soft">
            <span className="block h-full rounded-full bg-expense" style={{ width: width(q.expense) }} />
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
          <dt className="font-bold text-ink">{t.overview.quarterResult}</dt>
          <dd className="text-xl font-black tabular-nums">
            <Money cents={q.net} signed locale={locale} />
          </dd>
        </div>
      </dl>
      <Link
        href={`/${locale}/report?period=${year}-Q${quarter}`}
        className="group mt-auto inline-flex items-center gap-3 pt-6 font-bold text-gold-700 hover:text-gold-800"
      >
        {t.overview.toReport}
        <GoldArrow className="w-16 text-gold-500 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
      </Link>
    </section>
  );
}

function ConfirmDelete({
  entry,
  onCancel,
  onConfirm,
}: {
  entry: Entry;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const { locale, t } = useFinance();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amount = formatEuro(entry.kind === "income" ? entry.cents : -entry.cents, locale, "always");

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (e) {
      const reason = errorText(e, t);
      setError(fill(t.form.deleteFailed, { reason }));
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-ink-soft">{fill(t.form.deleteBody, { purpose: entry.purpose, amount: `⁦${amount}⁩` })}</p>
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
          {busy ? t.common.deleting : t.common.delete}
        </button>
      </div>
    </div>
  );
}
