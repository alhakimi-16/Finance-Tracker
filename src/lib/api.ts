import type { PostgrestError } from "@supabase/supabase-js";
import type { Client, Database } from "./supabase";
import type { Entry, EntryInput, Member, Role } from "./types";

type Row = Database["public"]["Tables"]["transactions"]["Row"];

export type ErrorKind = "forbidden" | "missing" | "exists" | "invalid" | "network" | "unknown";

/** A database error sorted into the few cases the app explains to people. */
export class AppError extends Error {
  constructor(
    public kind: ErrorKind,
    message: string,
  ) {
    super(message);
  }
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

function toEntry(row: Row): Entry {
  return {
    id: row.id,
    kind: row.kind,
    cents: Math.round(Number(row.amount) * 100),
    date: row.date,
    purpose: row.purpose,
    category: row.category,
    comment: row.comment ?? "",
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
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

/** All entries, newest first. Loads page by page, because Supabase returns at most 1000 rows per request. */
export async function fetchEntries(sb: Client): Promise<Entry[]> {
  const rows: Row[] = [];
  let total = Infinity;
  while (rows.length < total) {
    const { data, error, count, status } = await sb
      .from("transactions")
      .select("*", { count: rows.length === 0 ? "exact" : undefined })
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(rows.length, rows.length + PAGE_SIZE - 1);
    if (error) throw toAppError(error, status);
    if (count !== null) total = count;
    rows.push(...data);
    if (data.length === 0) break;
  }
  return rows.map(toEntry);
}

export async function createEntry(sb: Client, input: EntryInput): Promise<Entry> {
  const { data, error, status } = await sb.from("transactions").insert(toRow(input)).select().single();
  if (error) throw toAppError(error, status);
  return toEntry(data);
}

export async function updateEntry(sb: Client, id: string, input: EntryInput): Promise<Entry> {
  const { data, error, status } = await sb.from("transactions").update(toRow(input)).eq("id", id).select().single();
  if (error) throw toAppError(error, status);
  return toEntry(data);
}

export async function deleteEntry(sb: Client, id: string): Promise<void> {
  const { data, error, status } = await sb.from("transactions").delete().eq("id", id).select("id");
  if (error) throw toAppError(error, status);
  if (data.length === 0) throw new AppError("missing", "nothing deleted");
}

/** "admin", "viewer", or null when the signed-in e-mail is not on the members list. */
export async function fetchMyRole(sb: Client): Promise<Role | null> {
  const { data, error, status } = await sb.rpc("my_role");
  if (error) throw toAppError(error, status);
  return data === "admin" || data === "viewer" ? data : null;
}

export async function fetchMembers(sb: Client): Promise<Member[]> {
  const { data, error, status } = await sb.from("members").select("*").order("created_at");
  if (error) throw toAppError(error, status);
  return data.map((row) => ({ email: row.email, role: row.role, createdAt: row.created_at }));
}

export async function addMember(sb: Client, email: string, role: Role): Promise<Member> {
  const { data, error, status } = await sb.from("members").insert({ email, role }).select().single();
  if (error) throw toAppError(error, status);
  return { email: data.email, role: data.role, createdAt: data.created_at };
}

export async function setMemberRole(sb: Client, email: string, role: Role): Promise<void> {
  const { data, error, status } = await sb.from("members").update({ role }).eq("email", email).select("email");
  if (error) throw toAppError(error, status);
  if (data.length === 0) throw new AppError("forbidden", "nothing updated");
}

export async function removeMember(sb: Client, email: string): Promise<void> {
  const { data, error, status } = await sb.from("members").delete().eq("email", email).select("email");
  if (error) throw toAppError(error, status);
  if (data.length === 0) throw new AppError("forbidden", "nothing deleted");
}
