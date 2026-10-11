import { createClient, type PostgrestError, type SupabaseClient } from "@supabase/supabase-js";
import { AppError, type ErrorKind } from "./errors";
import type { Account, Admin, Entry, EntryInput } from "./types";

/**
 * Everything the app asks of the database and the login, in one place.
 * The browser talks to Supabase directly; the access rules live in supabase/schema.sql.
 */

type Database = {
  __InternalSupabase: { PostgrestVersion: "12" };
  public: {
    Tables: {
      transactions: {
        Row: {
          id: string;
          kind: "income" | "expense";
          amount: number;
          date: string;
          purpose: string;
          category: string;
          comment: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: { kind: "income" | "expense"; amount: string; date: string; purpose: string; category: string; comment: string };
        Update: {
          kind?: "income" | "expense";
          amount?: string;
          date?: string;
          purpose?: string;
          category?: string;
          comment?: string;
        };
        Relationships: [];
      };
      admins: {
        Row: { email: string; created_at: string };
        Insert: { email: string };
        Update: { email?: string };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { is_admin: { Args: never; Returns: boolean } };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type Row = Database["public"]["Tables"]["transactions"]["Row"];

// Referenced literally so Next.js can inline them into the browser bundle at build time.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && key);

let client: SupabaseClient<Database> | null = null;

function sb(): SupabaseClient<Database> {
  if (!url || !key) throw new AppError("unknown", "Supabase is not configured");
  // keeps the login in localStorage; only ever created in the browser
  client ??= createClient<Database>(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}

function toAppError(error: PostgrestError, status: number): AppError {
  const kind: ErrorKind =
    status === 0
      ? "network"
      : error.code === "42501"
        ? "forbidden"
        : error.code === "PGRST116"
          ? "missing"
          : error.code === "23505"
            ? "exists"
            : /^(22|23)/.test(error.code)
              ? "invalid"
              : "unknown";
  return new AppError(kind, error.message);
}

/* ---------- login ---------- */

/** Calls back right away with the signed-in account (or null), and again whenever it changes. */
export function watchAccount(callback: (account: Account) => void): () => void {
  const { data } = sb().auth.onAuthStateChange((_event, session) =>
    callback(session ? { id: session.user.id, email: session.user.email ?? "" } : null),
  );
  return () => data.subscription.unsubscribe();
}

export async function signIn(email: string, password: string): Promise<"ok" | "wrong" | "failed"> {
  const { error } = await sb().auth.signInWithPassword({ email: email.trim(), password });
  if (!error) return "ok";
  return error.code === "invalid_credentials" ? "wrong" : "failed";
}

/** Signs out in this browser only, not on the person's other devices. */
export async function signOut(): Promise<void> {
  await sb().auth.signOut({ scope: "local" });
}

/** Null when it worked, otherwise Supabase's reason. */
export async function changePassword(password: string): Promise<string | null> {
  const { error } = await sb().auth.updateUser({ password });
  return error ? error.message : null;
}

export async function checkIsAdmin(): Promise<boolean> {
  const { data, error, status } = await sb().rpc("is_admin");
  if (error) throw toAppError(error, status);
  return data === true;
}

/* ---------- entries ---------- */

// what visitors may read (who typed an entry in is for admins only)
const PUBLIC_COLUMNS = "id,kind,amount,date,purpose,category,comment,created_at";

function toEntry(row: Partial<Row> & Pick<Row, "id" | "kind" | "amount" | "date" | "purpose" | "category" | "created_at">): Entry {
  return {
    id: row.id,
    kind: row.kind,
    cents: Math.round(Number(row.amount) * 100),
    date: row.date,
    purpose: row.purpose,
    category: row.category,
    comment: row.comment ?? "",
    createdAt: row.created_at,
    createdBy: row.created_by ?? null,
    updatedAt: row.updated_at ?? null,
    updatedBy: row.updated_by ?? null,
  };
}

function toRow(input: EntryInput) {
  const euros = Math.floor(input.cents / 100);
  const cents = String(input.cents % 100).padStart(2, "0");
  return {
    kind: input.kind,
    amount: `${euros}.${cents}`,
    date: input.date,
    purpose: input.purpose.trim(),
    category: input.category,
    comment: input.comment.trim(),
  };
}

const PAGE_SIZE = 1000;

/**
 * All entries, newest first. Loads page by page, because Supabase returns at most 1000 rows per request.
 * `withAuthors` (admins only) adds who typed each entry in and when it last changed.
 */
export async function fetchEntries(withAuthors: boolean): Promise<Entry[]> {
  const entries: Entry[] = [];
  let total = Infinity;
  while (entries.length < total) {
    const { data, error, count, status } = await sb()
      .from("transactions")
      .select(withAuthors ? "*" : PUBLIC_COLUMNS, { count: entries.length === 0 ? "exact" : undefined })
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(entries.length, entries.length + PAGE_SIZE - 1)
      .overrideTypes<Row[], { merge: false }>();
    if (error) throw toAppError(error, status);
    if (count !== null) total = count;
    entries.push(...data.map(toEntry));
    if (data.length === 0) break;
  }
  return entries;
}

export async function createEntry(input: EntryInput): Promise<Entry> {
  const { data, error, status } = await sb().from("transactions").insert(toRow(input)).select().single();
  if (error) throw toAppError(error, status);
  return toEntry(data);
}

export async function updateEntry(id: string, input: EntryInput): Promise<Entry> {
  const { data, error, status } = await sb().from("transactions").update(toRow(input)).eq("id", id).select().single();
  if (error) throw toAppError(error, status);
  return toEntry(data);
}

export async function deleteEntry(id: string): Promise<void> {
  const { data, error, status } = await sb().from("transactions").delete().eq("id", id).select("id");
  if (error) throw toAppError(error, status);
  if (data.length === 0) throw new AppError("missing", "nothing deleted");
}

/* ---------- admins ---------- */

export async function fetchAdmins(): Promise<Admin[]> {
  const { data, error, status } = await sb().from("admins").select("*").order("created_at");
  if (error) throw toAppError(error, status);
  return data.map((row) => ({ email: row.email, createdAt: row.created_at }));
}

export async function addAdmin(email: string): Promise<Admin> {
  const { data, error, status } = await sb().from("admins").insert({ email }).select().single();
  if (error) throw toAppError(error, status);
  return { email: data.email, createdAt: data.created_at };
}

export async function removeAdmin(email: string): Promise<void> {
  const { data, error, status } = await sb().from("admins").delete().eq("email", email).select("email");
  if (error) throw toAppError(error, status);
  if (data.length === 0) throw new AppError("forbidden", "nothing deleted");
}
