export type Kind = "income" | "expense";
export type Role = "admin" | "viewer";

/** One money movement, as the app works with it. */
export type Entry = {
  id: string;
  kind: Kind;
  /** always positive; the kind decides whether it adds or subtracts */
  cents: number;
  date: string;
  purpose: string;
  category: string;
  comment: string;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
};

export type EntryInput = Pick<Entry, "kind" | "cents" | "date" | "purpose" | "category" | "comment">;

export type Member = { email: string; role: Role; createdAt: string };

/** +cents for income, −cents for expenses */
export function signed(entry: Pick<Entry, "kind" | "cents">): number {
  return entry.kind === "income" ? entry.cents : -entry.cents;
}
