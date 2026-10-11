"use client";

import { Minus, Plus } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { fill } from "@/i18n/format";
import { AppError } from "@/lib/api";
import { categoriesFor, categoryName, defaultCategory } from "@/lib/categories";
import { formatTimestamp, isValidIsoDate, todayIso } from "@/lib/dates";
import { formatAmountInput, MAX_CENTS, parseAmount } from "@/lib/money";
import type { Entry, Kind } from "@/lib/types";
import { errorText, useFinance } from "./FinanceProvider";
import { Money } from "./Money";
import { btn, cx, field, fieldLook, label } from "./ui";

type Errors = Partial<Record<"amount" | "purpose" | "date", string>>;

/** Add a new entry or change an existing one. */
export function EntryForm({
  entry,
  initialKind = "income",
  onSaved,
  onCancel,
}: {
  entry?: Entry;
  initialKind?: Kind;
  onSaved: (saved: Entry) => void;
  onCancel: () => void;
}) {
  const { locale, t, entries, saveEntry } = useFinance();
  const [kind, setKind] = useState<Kind>(entry?.kind ?? initialKind);
  const [amountText, setAmountText] = useState(entry ? formatAmountInput(entry.cents, locale) : "");
  const [date, setDate] = useState(entry?.date ?? todayIso);
  const [purpose, setPurpose] = useState(entry?.purpose ?? "");
  const [category, setCategory] = useState(entry?.category ?? defaultCategory);
  const [comment, setComment] = useState(entry?.comment ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cents = parseAmount(amountText);
  const categoryOptions = categoriesFor(kind, entry?.category);
  // earlier purposes as suggestions, most recent first
  const purposeSuggestions = useMemo(() => [...new Set(entries.map((e) => e.purpose))].slice(0, 80), [entries]);

  function chooseKind(next: Kind) {
    setKind(next);
    if (!categoriesFor(next).includes(category)) setCategory(defaultCategory);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found: Errors = {};
    if (cents === null || cents <= 0) found.amount = t.form.errors.amount;
    else if (cents > MAX_CENTS) found.amount = t.form.errors.amountTooLarge;
    if (!purpose.trim()) found.purpose = t.form.errors.purpose;
    if (!isValidIsoDate(date)) found.date = t.form.errors.date;
    setErrors(found);
    if (Object.keys(found).length > 0 || cents === null) {
      const first = Object.keys(found)[0];
      document.getElementById(`entry-${first}`)?.focus();
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const saved = await saveEntry({ kind, cents, date, purpose, category, comment }, entry?.id);
      onSaved(saved);
    } catch (error) {
      const reason = error instanceof AppError ? errorText(error, t) : t.errors.unknown;
      setSaveError(fill(t.form.saveFailed, { reason }));
      setSaving(false);
    }
  }

  const kinds: { id: Kind; text: string; hint: string; Icon: typeof Plus; active: string }[] = [
    {
      id: "income",
      text: t.form.income,
      hint: t.form.incomeHint,
      Icon: Plus,
      active: "border-income bg-income text-white",
    },
    {
      id: "expense",
      text: t.form.expense,
      hint: t.form.expenseHint,
      Icon: Minus,
      active: "border-expense bg-expense text-white",
    },
  ];

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <fieldset>
        <legend className={label}>{t.form.kind}</legend>
        <div className="grid grid-cols-2 gap-3">
          {kinds.map(({ id, text, hint, Icon, active }) => (
            <label
              key={id}
              className={cx(
                "flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-gold-600",
                kind === id ? active : "border-line-strong bg-white text-ink-soft hover:border-gold-500",
              )}
            >
              <input
                type="radio"
                name="kind"
                value={id}
                checked={kind === id}
                onChange={() => chooseKind(id)}
                className="sr-only"
              />
              <span
                className={cx(
                  "grid size-8 shrink-0 place-items-center rounded-full",
                  kind === id
                    ? "bg-white/20"
                    : id === "income"
                      ? "bg-income-soft text-income"
                      : "bg-expense-soft text-expense",
                )}
              >
                <Icon aria-hidden className="size-5" strokeWidth={3} />
              </span>
              <span className="min-w-0">
                <span className="block text-lg leading-tight font-black">{text}</span>
                <span className={cx("block text-xs", kind === id ? "text-white/90" : "text-muted")}>{hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="entry-amount" className={label}>
            {t.form.amount}
          </label>
          <input
            id="entry-amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            data-autofocus
            dir="ltr"
            placeholder={t.form.amountPlaceholder}
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            aria-invalid={errors.amount ? true : undefined}
            aria-describedby={errors.amount ? "entry-amount-error" : "entry-amount-preview"}
            className={cx(field, "text-lg font-bold tabular-nums rtl:text-right")}
          />
          {errors.amount ? (
            <p id="entry-amount-error" className="mt-1.5 text-sm font-semibold text-expense">
              {errors.amount}
            </p>
          ) : (
            <p id="entry-amount-preview" aria-live="polite" className="mt-1.5 text-sm text-muted">
              {t.form.preview}{" "}
              {cents !== null && cents > 0 ? (
                <Money cents={cents} kind={kind} locale={locale} className="text-base font-black" />
              ) : (
                "–"
              )}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="entry-date" className={label}>
            {t.form.date}
          </label>
          <input
            id="entry-date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-invalid={errors.date ? true : undefined}
            aria-describedby={errors.date ? "entry-date-error" : undefined}
            className={field}
          />
          {errors.date && (
            <p id="entry-date-error" className="mt-1.5 text-sm font-semibold text-expense">
              {errors.date}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="entry-purpose" className={label}>
          {t.form.purpose}
        </label>
        <input
          id="entry-purpose"
          type="text"
          maxLength={200}
          list="entry-purpose-suggestions"
          placeholder={t.form.purposePlaceholder}
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          aria-invalid={errors.purpose ? true : undefined}
          aria-describedby={errors.purpose ? "entry-purpose-error" : undefined}
          className={field}
        />
        <datalist id="entry-purpose-suggestions">
          {purposeSuggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
        {errors.purpose && (
          <p id="entry-purpose-error" className="mt-1.5 text-sm font-semibold text-expense">
            {errors.purpose}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="entry-category" className={label}>
          {t.form.category}
        </label>
        <select id="entry-category" value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
          {categoryOptions.map((id) => (
            <option key={id} value={id}>
              {categoryName(id, t)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="entry-comment" className={label}>
          {t.form.comment} <span className="font-normal text-muted">({t.form.optional})</span>
        </label>
        <textarea
          id="entry-comment"
          rows={3}
          maxLength={2000}
          placeholder={t.form.commentPlaceholder}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className={cx(fieldLook, "w-full px-4 py-2.5")}
        />
      </div>

      {entry && (
        <p className="text-xs text-muted">
          {fill(t.form.created, {
            date: formatTimestamp(entry.createdAt, locale),
            who: entry.createdBy ?? t.common.unknownUser,
          })}
          {entry.updatedAt !== entry.createdAt && (
            <>
              <br />
              {fill(t.form.updated, {
                date: formatTimestamp(entry.updatedAt, locale),
                who: entry.updatedBy ?? t.common.unknownUser,
              })}
            </>
          )}
        </p>
      )}

      {saveError && (
        <p role="alert" className="rounded-2xl bg-expense-soft px-4 py-2.5 text-sm font-semibold text-expense">
          {saveError}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-3 pt-1">
        <button type="button" onClick={onCancel} className={btn("quiet")}>
          {t.common.cancel}
        </button>
        <button type="submit" disabled={saving} className={btn(kind)}>
          {saving ? t.common.saving : t.common.save}
        </button>
      </div>
    </form>
  );
}
