"use client";

import { Download, Pencil, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { fill, plural } from "@/i18n/format";
import { categories, categoryName } from "@/lib/categories";
import { downloadCsv, entriesToCsv } from "@/lib/csv";
import { formatDate, quarterOf, todayIso } from "@/lib/dates";
import { totals } from "@/lib/ledger";
import { formatAmountInput, formatEuro } from "@/lib/money";
import { normalizeForSearch } from "@/lib/search";
import type { Entry, Kind } from "@/lib/types";
import { useFinance } from "./FinanceProvider";
import { Money } from "./Money";
import { CategoryIcon } from "./CategoryIcon";
import { btn, card, cx, field, fieldLook, iconButton, iconButtonDanger } from "./ui";

type Filters = { query: string; kind: "all" | Kind; period: string; category: string };

const noFilters: Filters = { query: "", kind: "all", period: "all", category: "all" };

function inPeriod(entry: Entry, period: string): boolean {
  if (period === "all") return true;
  const [year, quarter] = period.split("-Q").map(Number);
  const q = quarterOf(entry.date);
  return q.year === year && (!quarter || q.quarter === quarter);
}

/** The list of all entries with search, filters, CSV export, and edit/delete for admins. */
export function EntriesSection({
  balances,
  flashId,
  onEdit,
  onDelete,
}: {
  balances: Map<string, number>;
  flashId: string | null;
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
}) {
  const { locale, t, entries, canEdit } = useFinance();
  const [filters, setFilters] = useState<Filters>(noFilters);
  const filtered =
    filters.query.trim() !== "" || filters.kind !== "all" || filters.period !== "all" || filters.category !== "all";

  // "2026", "Q4 2026", … for the years and quarters that have entries
  const periodOptions = useMemo(() => {
    const quarters = new Map<number, Set<number>>();
    for (const entry of entries) {
      const { year, quarter } = quarterOf(entry.date);
      quarters.set(year, (quarters.get(year) ?? new Set()).add(quarter));
    }
    return [...quarters.entries()]
      .sort(([a], [b]) => b - a)
      .map(([year, qs]) => ({ year, quarters: [...qs].sort((a, b) => b - a) }));
  }, [entries]);

  // search text per entry: purpose, comment, category, date and amount in this language
  const searchText = useMemo(() => {
    const texts = new Map<string, string>();
    for (const entry of entries) {
      texts.set(
        entry.id,
        normalizeForSearch(
          [
            entry.purpose,
            entry.comment,
            categoryName(entry.category, t),
            formatDate(entry.date, locale),
            formatAmountInput(entry.cents, locale),
            formatEuro(entry.cents, locale),
          ].join(" "),
        ),
      );
    }
    return texts;
  }, [entries, locale, t]);

  const visible = useMemo(() => {
    const words = normalizeForSearch(filters.query).split(/\s+/).filter(Boolean);
    return entries.filter(
      (entry) =>
        (filters.kind === "all" || entry.kind === filters.kind) &&
        (filters.category === "all" || entry.category === filters.category) &&
        inPeriod(entry, filters.period) &&
        words.every((word) => searchText.get(entry.id)?.includes(word)),
    );
  }, [entries, filters, searchText]);

  const sums = totals(visible);
  const usedCategories = useMemo(() => {
    const used = new Set(entries.map((entry) => entry.category));
    const known = categories.map((category) => category.id).filter((id) => used.has(id));
    return [...known, ...[...used].filter((id) => !known.includes(id))];
  }, [entries]);

  function exportCsv() {
    downloadCsv(entriesToCsv(visible, balances, t, canEdit), `vjsd7-kassenbuch-${todayIso()}.csv`, locale);
  }

  const set = (patch: Partial<Filters>) => setFilters((current) => ({ ...current, ...patch }));

  return (
    <section aria-labelledby="entries-title" className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="entries-title" className="text-3xl font-black">
            {t.entries.title}
          </h2>
          <p className="text-sm text-muted">{plural(locale, entries.length, t.overview.entries)}</p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={visible.length === 0}
          title={t.entries.exportHint}
          className={btn("quiet")}
        >
          <Download aria-hidden className="size-4" />
          {t.entries.export}
        </button>
      </div>

      {/* filters */}
      <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => set({ query: e.target.value })}
            placeholder={t.entries.search}
            aria-label={t.entries.searchLabel}
            className={cx(fieldLook, "h-11 w-full ps-10 pe-4")}
          />
        </div>
        <div
          role="group"
          aria-label={t.entries.kind}
          className="flex rounded-2xl border border-line-strong bg-field p-1"
        >
          {(["all", "income", "expense"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              aria-pressed={filters.kind === kind}
              onClick={() => set({ kind })}
              className={cx(
                "flex-1 rounded-xl px-3 py-1.5 text-sm font-bold whitespace-nowrap transition-colors",
                filters.kind === kind
                  ? kind === "income"
                    ? "bg-income-strong text-white"
                    : kind === "expense"
                      ? "bg-expense-strong text-white"
                      : "bg-gold-600 text-white"
                  : "text-ink-soft hover:bg-gold-50",
              )}
            >
              {t.entries.kinds[kind]}
            </button>
          ))}
        </div>
        <select
          value={filters.period}
          onChange={(e) => set({ period: e.target.value })}
          aria-label={t.entries.period}
          className={cx(field, "lg:w-auto")}
        >
          <option value="all">{t.entries.allPeriods}</option>
          {periodOptions.map(({ year, quarters }) => (
            <optgroup key={year} label={String(year)}>
              <option value={String(year)}>
                {year} · {t.report.fullYear}
              </option>
              {quarters.map((q) => (
                <option key={q} value={`${year}-Q${q}`}>
                  {t.report.quartersShort[q - 1]} {year}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <select
          value={filters.category}
          onChange={(e) => set({ category: e.target.value })}
          aria-label={t.entries.category}
          className={cx(field, "lg:w-auto")}
        >
          <option value="all">{t.entries.allCategories}</option>
          {usedCategories.map((id) => (
            <option key={id} value={id}>
              {categoryName(id, t)}
            </option>
          ))}
        </select>
      </div>

      {/* what the filters add up to */}
      {filtered && (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-2xl bg-gold-50 px-4 py-2.5 text-sm">
          <span className="font-bold text-ink">{plural(locale, visible.length, t.entries.shown)}</span>
          <span className="text-muted">
            {t.entries.kinds.income} <Money cents={sums.income} kind="income" locale={locale} className="font-bold" />
          </span>
          <span className="text-muted">
            {t.entries.kinds.expense}{" "}
            <Money cents={sums.expense} kind="expense" locale={locale} className="font-bold" />
          </span>
          <span className="text-muted">
            {t.entries.selectionSum} <Money cents={sums.net} signed locale={locale} className="font-bold" />
          </span>
          <button
            type="button"
            onClick={() => setFilters(noFilters)}
            className="ms-auto font-bold text-gold-700 underline-offset-4 hover:underline"
          >
            {t.entries.resetFilters}
          </button>
        </div>
      )}

      {entries.length === 0 ? (
        <p className={cx(card, "mt-5 p-8 text-center text-muted")}>
          {canEdit ? t.entries.empty : t.entries.emptyViewer}
        </p>
      ) : visible.length === 0 ? (
        <p className={cx(card, "mt-5 p-8 text-center text-muted")}>{t.entries.noMatches}</p>
      ) : (
        <>
          <EntryTable
            entries={visible}
            balances={balances}
            flashId={flashId}
            onEdit={canEdit ? onEdit : undefined}
            onDelete={canEdit ? onDelete : undefined}
          />
          <EntryCards
            entries={visible}
            balances={balances}
            flashId={flashId}
            onEdit={canEdit ? onEdit : undefined}
            onDelete={canEdit ? onDelete : undefined}
          />
        </>
      )}
    </section>
  );
}

type ListProps = {
  entries: Entry[];
  balances: Map<string, number>;
  flashId: string | null;
  onEdit?: (entry: Entry) => void;
  onDelete?: (entry: Entry) => void;
};

function CategoryChip({ id }: { id: string }) {
  const { t } = useFinance();
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gold-50 px-2 py-0.5 text-xs font-semibold text-gold-700 ring-1 ring-gold-200 ring-inset">
      <CategoryIcon id={id} className="size-3.5" />
      {categoryName(id, t)}
    </span>
  );
}

function RowActions({ entry, onEdit, onDelete }: { entry: Entry } & Pick<ListProps, "onEdit" | "onDelete">) {
  const { t } = useFinance();
  if (!onEdit || !onDelete) return null;
  return (
    <span className="flex items-center justify-end gap-0.5">
      <button
        type="button"
        onClick={() => onEdit(entry)}
        aria-label={fill(t.entries.editEntry, { purpose: entry.purpose })}
        title={t.common.edit}
        className={iconButton}
      >
        <Pencil aria-hidden className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(entry)}
        aria-label={fill(t.entries.deleteEntry, { purpose: entry.purpose })}
        title={t.common.delete}
        className={iconButtonDanger}
      >
        <Trash2 aria-hidden className="size-4" />
      </button>
    </span>
  );
}

/** Wide screens: a table whose header is a gold pill, like the bars on the poster. */
function EntryTable({ entries, balances, flashId, onEdit, onDelete }: ListProps) {
  const { locale, t } = useFinance();
  const c = t.entries.columns;
  const head = "bg-gold-600 px-4 py-2.5 text-sm font-bold text-white";
  const cellBase = "border-y border-line bg-card px-4 py-3 align-middle transition-colors group-hover:bg-gold-50";

  return (
    <div className="mt-5 hidden md:block">
      <table className="w-full border-separate border-spacing-y-2">
        <thead>
          <tr>
            <th scope="col" className={cx(head, "w-32 rounded-s-full ps-6 text-start")}>
              {c.date}
            </th>
            <th scope="col" className={cx(head, "text-start")}>
              {c.purpose}
            </th>
            <th scope="col" className={cx(head, "text-start")}>
              {c.comment}
            </th>
            <th scope="col" className={cx(head, "text-end")}>
              {c.amount}
            </th>
            <th scope="col" className={cx(head, "text-end", !onEdit && "rounded-e-full pe-6")}>
              <abbr title={t.entries.balanceHint} className="no-underline">
                {c.balance}
              </abbr>
            </th>
            {onEdit && (
              <th scope="col" className={cx(head, "w-24 rounded-e-full pe-6")}>
                <span className="sr-only">{c.actions}</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className={cx("group", entry.id === flashId && "[&>td]:animate-flash")}>
              <td
                className={cx(
                  cellBase,
                  "rounded-s-2xl border-s ps-6 text-sm whitespace-nowrap text-ink-soft tabular-nums",
                )}
              >
                <time dateTime={entry.date} title={formatDate(entry.date, locale, "long")}>
                  {formatDate(entry.date, locale)}
                </time>
              </td>
              <td className={cellBase}>
                <span className="block font-bold text-ink">{entry.purpose}</span>
                <span className="mt-1 block">
                  <CategoryChip id={entry.category} />
                </span>
              </td>
              <td className={cx(cellBase, "max-w-xs text-sm text-muted")}>
                <span className="line-clamp-2" title={entry.comment || undefined}>
                  {entry.comment}
                </span>
              </td>
              <td className={cx(cellBase, "text-end text-lg font-black tabular-nums")}>
                <Money cents={entry.cents} kind={entry.kind} locale={locale} />
              </td>
              <td
                className={cx(
                  cellBase,
                  "text-end text-sm text-muted tabular-nums",
                  !onEdit && "rounded-e-2xl border-e pe-6",
                )}
              >
                <Money cents={balances.get(entry.id) ?? 0} locale={locale} />
              </td>
              {onEdit && (
                <td className={cx(cellBase, "rounded-e-2xl border-e pe-4")}>
                  <RowActions entry={entry} onEdit={onEdit} onDelete={onDelete} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Phones: one card per entry. */
function EntryCards({ entries, balances, flashId, onEdit, onDelete }: ListProps) {
  const { locale, t } = useFinance();
  return (
    <ul className="mt-5 space-y-2.5 md:hidden">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className={cx("rounded-2xl border border-line bg-card p-4", entry.id === flashId && "animate-flash")}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold break-words text-ink">{entry.purpose}</p>
              <p className="mt-0.5 text-xs text-muted">
                <time dateTime={entry.date}>{formatDate(entry.date, locale)}</time>
              </p>
            </div>
            <Money cents={entry.cents} kind={entry.kind} locale={locale} className="text-lg font-black tabular-nums" />
          </div>
          <div className="mt-2">
            <CategoryChip id={entry.category} />
          </div>
          {entry.comment && <p className="mt-2 text-sm break-words text-muted">{entry.comment}</p>}
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-line pt-2 text-xs text-muted">
            <span>
              {t.entries.columns.balance}:{" "}
              <Money cents={balances.get(entry.id) ?? 0} locale={locale} className="font-semibold tabular-nums" />
            </span>
            <RowActions entry={entry} onEdit={onEdit} onDelete={onDelete} />
          </div>
        </li>
      ))}
    </ul>
  );
}
