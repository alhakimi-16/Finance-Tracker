import { signed, type Entry, type Kind } from "./types";

/** Newest first: by date, then by when the entry was recorded. */
export function newestFirst(a: Entry, b: Entry): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  return a.id < b.id ? 1 : -1;
}

/** The account balance right after each entry, in booking order. */
export function runningBalances(entries: Entry[]): Map<string, number> {
  const chronological = [...entries].sort((a, b) => newestFirst(b, a));
  const balances = new Map<string, number>();
  let balance = 0;
  for (const entry of chronological) {
    balance += signed(entry);
    balances.set(entry.id, balance);
  }
  return balances;
}

export type Totals = { income: number; expense: number; net: number; count: number };

export function totals(entries: Entry[]): Totals {
  let income = 0;
  let expense = 0;
  for (const entry of entries) {
    if (entry.kind === "income") income += entry.cents;
    else expense += entry.cents;
  }
  return { income, expense, net: income - expense, count: entries.length };
}

/** Balance at the end of a day (all entries up to and including it). */
export function balanceAt(entries: Entry[], isoDate: string): number {
  let balance = 0;
  for (const entry of entries) if (entry.date <= isoDate) balance += signed(entry);
  return balance;
}

export function inRange(entries: Entry[], start: string, end: string): Entry[] {
  return entries.filter((entry) => entry.date >= start && entry.date <= end);
}

export type CategorySum = { category: string; cents: number; count: number };

/** Sums per category for one kind, biggest first. */
export function byCategory(entries: Entry[], kind: Kind): CategorySum[] {
  const sums = new Map<string, CategorySum>();
  for (const entry of entries) {
    if (entry.kind !== kind) continue;
    const sum = sums.get(entry.category) ?? { category: entry.category, cents: 0, count: 0 };
    sum.cents += entry.cents;
    sum.count += 1;
    sums.set(entry.category, sum);
  }
  return [...sums.values()].sort((a, b) => b.cents - a.cents);
}

/** Totals per calendar month (1-12) of the given entries. */
export function byMonth(entries: Entry[]): Map<number, Totals> {
  const months = new Map<number, Entry[]>();
  for (const entry of entries) {
    const month = Number(entry.date.slice(5, 7));
    months.set(month, [...(months.get(month) ?? []), entry]);
  }
  return new Map([...months].map(([month, list]) => [month, totals(list)]));
}

/** Years that have entries, plus the current one, newest first. */
export function yearsWithEntries(entries: Entry[], currentYear: number): number[] {
  const years = new Set([currentYear, ...entries.map((entry) => Number(entry.date.slice(0, 4)))]);
  return [...years].sort((a, b) => b - a);
}
