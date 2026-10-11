"use client";

import { Printer } from "lucide-react";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import { localeInfo } from "@/i18n/config";
import { fill } from "@/i18n/format";
import { categoryName } from "@/lib/categories";
import {
  dayBefore,
  formatDate,
  monthName,
  periodMonths,
  periodRange,
  quarterOf,
  todayIso,
  type Quarter,
} from "@/lib/dates";
import {
  balanceAt,
  byCategory,
  byMonth,
  inRange,
  runningBalances,
  totals,
  yearsWithEntries,
  type CategorySum,
} from "@/lib/ledger";
import type { Entry } from "@/lib/types";
import { useFinance } from "./FinanceProvider";
import { Loading } from "./Gate";
import { CategoryIcon } from "./CategoryIcon";
import { Money } from "./Money";
import { btn, card, cx, fieldLook } from "./ui";

/** Quarterly (or yearly) report: opening balance, income and expenses by category, closing balance. */
export function Report() {
  const { locale, t, entries, entriesLoaded, email } = useFinance();
  const today = todayIso();
  const now = quarterOf(today);
  const [year, setYear] = useState(now.year);
  const [quarter, setQuarter] = useState<Quarter | null>(now.quarter);

  if (!entriesLoaded) return <Loading />;

  const { start, end } = periodRange({ year, quarter });
  const list = inRange(entries, start, end);
  const chronological = [...list].reverse();
  const opening = balanceAt(entries, dayBefore(start));
  const sums = totals(list);
  const closing = opening + sums.net;
  // for the running quarter, the closing balance is today's
  const closingDate = end < today || start > today ? end : today;
  const balances = runningBalances(entries);
  const months = byMonth(list);
  const title = quarter
    ? `${t.report.title}: ${t.report.quarters[quarter - 1]} ${year}`
    : `${t.report.yearTitle} ${year}`;

  return (
    <div>
      {/* period choice, not printed */}
      <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          aria-label={t.report.year}
          className={cx(fieldLook, "h-11 px-4 font-bold")}
        >
          {yearsWithEntries(entries, now.year).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <div
          role="group"
          aria-label={t.report.period}
          className="flex flex-wrap rounded-2xl border border-line-strong bg-white p-1"
        >
          {([1, 2, 3, 4, null] as const).map((q) => (
            <button
              key={q ?? "year"}
              type="button"
              aria-pressed={quarter === q}
              onClick={() => setQuarter(q)}
              className={cx(
                "rounded-xl px-3 py-1.5 text-sm font-bold whitespace-nowrap transition-colors",
                quarter === q ? "bg-gold-600 text-white" : "text-ink-soft hover:bg-gold-50",
              )}
            >
              {q ? t.report.quartersShort[q - 1] : t.report.fullYear}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => window.print()} className={cx(btn("gold"), "ms-auto")}>
          <Printer aria-hidden className="size-4" />
          {t.report.print}
        </button>
      </div>

      <article
        className={cx(
          card,
          "p-5 [print-color-adjust:exact] sm:p-8 print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none",
        )}
      >
        <header className="flex items-start justify-between gap-6 border-b border-line pb-6">
          <div>
            <p className="text-sm font-semibold text-gold-700">{t.brand.kicker}</p>
            <h1 className="mt-1 text-2xl font-black sm:text-4xl">{title}</h1>
            <p className="mt-1 text-muted">
              {formatDate(start, locale, "long")} – {formatDate(end, locale, "long")}
            </p>
          </div>
          <Image
            src="/logo.png"
            alt={t.brand.logoAlt}
            width={148}
            height={182}
            loading="eager"
            className="hidden h-24 w-auto print:block"
          />
        </header>

        {/* opening + income − expenses = closing */}
        <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryTile
            label={t.report.opening}
            hint={fill(t.report.openingHint, { date: formatDate(dayBefore(start), locale) })}
          >
            <Money cents={opening} locale={locale} />
          </SummaryTile>
          <SummaryTile label={t.report.income} tone="income">
            <Money cents={sums.income} kind="income" locale={locale} />
          </SummaryTile>
          <SummaryTile label={t.report.expense} tone="expense">
            <Money cents={sums.expense} kind="expense" locale={locale} />
          </SummaryTile>
          <SummaryTile
            label={t.report.closing}
            hint={fill(t.report.closingHint, { date: formatDate(closingDate, locale) })}
            tone="gold"
          >
            <Money cents={closing} locale={locale} />
          </SummaryTile>
        </dl>

        {list.length === 0 ? (
          <p className="mt-8 rounded-2xl bg-gold-50 p-6 text-center text-muted">{t.report.none}</p>
        ) : (
          <>
            <div className="mt-8 grid gap-8 lg:grid-cols-2">
              <CategoryTable title={t.report.incomeByCategory} sums={byCategory(list, "income")} total={sums.income} />
              <CategoryTable
                title={t.report.expenseByCategory}
                sums={byCategory(list, "expense")}
                total={sums.expense}
              />
            </div>

            <section className="mt-10 break-inside-avoid">
              <h2 className="text-xl font-black">{t.report.byMonth}</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-md text-sm">
                  <thead>
                    <tr className="border-b-2 border-gold-500 text-start text-ink-soft">
                      <th scope="col" className="py-2 pe-4 text-start font-bold">
                        {t.report.month}
                      </th>
                      <th scope="col" className="py-2 pe-4 text-end font-bold">
                        {t.report.income}
                      </th>
                      <th scope="col" className="py-2 pe-4 text-end font-bold">
                        {t.report.expense}
                      </th>
                      <th scope="col" className="py-2 text-end font-bold">
                        {t.report.result}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {periodMonths({ year, quarter }).map((month) => {
                      const m = months.get(month) ?? { income: 0, expense: 0, net: 0, count: 0 };
                      return (
                        <tr key={month} className="border-b border-line">
                          <th scope="row" className="py-2 pe-4 text-start font-semibold">
                            {monthName(month, locale)}
                          </th>
                          <td className="py-2 pe-4 text-end">
                            <Money cents={m.income} kind="income" locale={locale} />
                          </td>
                          <td className="py-2 pe-4 text-end">
                            <Money cents={m.expense} kind="expense" locale={locale} />
                          </td>
                          <td className="py-2 text-end font-bold">
                            <Money cents={m.net} signed locale={locale} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="tabular-nums">
                    <tr className="font-black">
                      <th scope="row" className="py-2 pe-4 text-start">
                        {t.report.total}
                      </th>
                      <td className="py-2 pe-4 text-end">
                        <Money cents={sums.income} kind="income" locale={locale} />
                      </td>
                      <td className="py-2 pe-4 text-end">
                        <Money cents={sums.expense} kind="expense" locale={locale} />
                      </td>
                      <td className="py-2 text-end">
                        <Money cents={sums.net} signed locale={locale} />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            <EntryList entries={chronological} balances={balances} />
          </>
        )}

        <footer className="mt-10 border-t border-line pt-4 text-sm text-muted">
          <p>
            {fill(t.report.generated, {
              date: formatDate(today, locale, "long"),
              who: email ?? t.common.unknownUser,
            })}
          </p>
          <div className="mt-16 hidden grid-cols-2 gap-10 print:grid">
            <p className="border-t border-ink pt-1">{t.report.place}</p>
            <p className="border-t border-ink pt-1">{t.report.signature}</p>
          </div>
        </footer>
      </article>
    </div>
  );
}

function SummaryTile({
  label,
  hint,
  tone,
  children,
}: {
  label: string;
  hint?: string;
  tone?: "income" | "expense" | "gold";
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "rounded-2xl px-4 py-3",
        tone === "income"
          ? "bg-income-soft/70"
          : tone === "expense"
            ? "bg-expense-soft/70"
            : tone === "gold"
              ? "bg-gold-100"
              : "bg-paper",
      )}
    >
      <dt className="text-sm font-bold text-ink-soft">{label}</dt>
      <dd className="mt-1 text-2xl font-black">{children}</dd>
      {hint && <dd className="text-xs text-muted">{hint}</dd>}
    </div>
  );
}

function CategoryTable({ title, sums, total }: { title: string; sums: CategorySum[]; total: number }) {
  const { locale, t } = useFinance();
  return (
    <section className="break-inside-avoid">
      <h2 className="text-xl font-black">{title}</h2>
      {sums.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{t.report.noneOfKind}</p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gold-500 text-ink-soft">
              <th scope="col" className="py-2 pe-3 text-start font-bold">
                {t.entries.columns.category}
              </th>
              <th scope="col" className="py-2 pe-3 text-end font-bold">
                {t.report.count}
              </th>
              <th scope="col" className="py-2 pe-3 text-end font-bold">
                {t.report.sum}
              </th>
              <th scope="col" className="w-28 py-2 text-end font-bold">
                {t.report.share}
              </th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {sums.map((sum) => {
              const share = total > 0 ? sum.cents / total : 0;
              return (
                <tr key={sum.category} className="border-b border-line">
                  <th scope="row" className="py-2 pe-3 text-start font-semibold">
                    <span className="inline-flex items-center gap-1.5">
                      <CategoryIcon id={sum.category} className="size-4 text-gold-700" />
                      {categoryName(sum.category, t)}
                    </span>
                  </th>
                  <td className="py-2 pe-3 text-end text-muted">{sum.count}</td>
                  <td className="py-2 pe-3 text-end font-bold">
                    <Money cents={sum.cents} locale={locale} />
                  </td>
                  <td className="py-2 text-end">
                    <span className="flex items-center justify-end gap-2">
                      <span aria-hidden className="h-2 w-14 overflow-hidden rounded-full bg-gold-100">
                        <span
                          className="block h-full rounded-e-full bg-gold-500"
                          style={{ width: `${Math.max(share * 100, share > 0 ? 4 : 0)}%` }}
                        />
                      </span>
                      <span className="w-10 text-muted">
                        {new Intl.NumberFormat(localeInfo[locale].intl, { style: "percent" }).format(share)}
                      </span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

function EntryList({ entries, balances }: { entries: Entry[]; balances: Map<string, number> }) {
  const { locale, t } = useFinance();
  const c = t.entries.columns;
  return (
    <section className="mt-10">
      <h2 className="text-xl font-black">{t.report.entries}</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-2xl text-sm">
          <thead>
            <tr className="border-b-2 border-gold-500 text-ink-soft">
              <th scope="col" className="py-2 pe-3 text-start font-bold">
                {c.date}
              </th>
              <th scope="col" className="py-2 pe-3 text-start font-bold">
                {c.purpose}
              </th>
              <th scope="col" className="py-2 pe-3 text-start font-bold">
                {c.category}
              </th>
              <th scope="col" className="py-2 pe-3 text-start font-bold">
                {c.comment}
              </th>
              <th scope="col" className="py-2 pe-3 text-end font-bold">
                {c.amount}
              </th>
              <th scope="col" className="py-2 text-end font-bold">
                {c.balance}
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="break-inside-avoid border-b border-line align-top">
                <td className="py-2 pe-3 whitespace-nowrap tabular-nums">{formatDate(entry.date, locale)}</td>
                <td className="py-2 pe-3 font-semibold">{entry.purpose}</td>
                <td className="py-2 pe-3 text-muted">{categoryName(entry.category, t)}</td>
                <td className="py-2 pe-3 text-muted">{entry.comment}</td>
                <td className="py-2 pe-3 text-end font-bold tabular-nums">
                  <Money cents={entry.cents} kind={entry.kind} locale={locale} />
                </td>
                <td className="py-2 text-end text-muted tabular-nums">
                  <Money cents={balances.get(entry.id) ?? 0} locale={locale} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
