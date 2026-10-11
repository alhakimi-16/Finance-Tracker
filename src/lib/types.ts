export type Kind = "income" | "expense";

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
  /** who typed it in and when it last changed: only admins get these */
  createdBy: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type EntryInput = Pick<Entry, "kind" | "cents" | "date" | "purpose" | "category" | "comment">;

/** A person who may sign in and change entries. */
export type Admin = { email: string; createdAt: string };

/** The signed-in person, or null for visitors. */
export type Account = { id: string; email: string } | null;

/** +cents for income, −cents for expenses */
export function signed(entry: Pick<Entry, "kind" | "cents">): number {
  return entry.kind === "income" ? entry.cents : -entry.cents;
}
