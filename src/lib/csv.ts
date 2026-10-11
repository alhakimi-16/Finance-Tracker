import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { categoryName } from "./categories";
import { signed, type Entry } from "./types";

function cell(value: string): string {
  // formulas from text cells are a known Excel risk: neutralise leading = + - @
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** "2026-10-11 16:46" in the visitor's time zone */
function localTimestamp(timestamp: string): string {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function amount(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
}

/**
 * A CSV file for Excel/LibreOffice/Google Sheets: semicolons and decimal commas (German Excel),
 * UTF-8 with BOM so umlauts and Arabic show correctly. Expenses are negative numbers.
 */
export function entriesToCsv(entries: Entry[], balances: Map<string, number>, t: Dictionary): string {
  const c = t.entries.columns;
  const header = [c.date, c.kind, c.amount, c.purpose, c.category, c.comment, c.balance, c.createdBy, c.updatedAt];
  const rows = entries.map((entry) => [
    entry.date,
    entry.kind === "income" ? t.form.income : t.form.expense,
    amount(signed(entry)),
    cell(entry.purpose),
    cell(categoryName(entry.category, t)),
    cell(entry.comment),
    amount(balances.get(entry.id) ?? 0),
    cell(entry.createdBy ?? ""),
    localTimestamp(entry.updatedAt),
  ]);
  return "﻿" + [header.map(cell), ...rows].map((row) => row.join(";")).join("\r\n") + "\r\n";
}

export function downloadCsv(content: string, name: string, locale: Locale) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.lang = locale;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
