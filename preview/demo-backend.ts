import type * as RealBackend from "@/lib/backend";
import type { ConfigProblem } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { newestFirst } from "@/lib/ledger";
import type { Account, Admin, Entry, EntryInput } from "@/lib/types";
import type * as ThisFile from "./demo-backend";

/**
 * A stand-in for src/lib/backend.ts that keeps everything in memory, for the test version:
 * it starts empty (balance 0 €), and reloading the page forgets every entry.
 * Any e-mail address signs in with any password and becomes an admin: nothing is checked or stored,
 * so no real password ever ends up in this page.
 */

export const configProblem: ConfigProblem | null = null;

let account: Account = null;
let entries: Entry[] = [];
let admins: Admin[] = [];
const listeners = new Set<(account: Account) => void>();

const wait = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));
const now = () => new Date().toISOString();
const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function emit() {
  for (const listener of listeners) listener(account);
}

function adminEmail(): string {
  if (!account || !admins.some((admin) => admin.email === account?.email)) {
    throw new AppError("forbidden", "only admins may do this");
  }
  return account.email;
}

function clean(input: EntryInput): EntryInput {
  return { ...input, purpose: input.purpose.trim(), comment: input.comment.trim() };
}

export function watchAccount(callback: (account: Account) => void): () => void {
  listeners.add(callback);
  setTimeout(() => callback(account), 0);
  return () => listeners.delete(callback);
}

export async function signIn(email: string, password: string): Promise<"ok" | "wrong" | "failed"> {
  await wait(350);
  const address = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) || password === "") return "wrong";
  if (!admins.some((admin) => admin.email === address)) admins.push({ email: address, createdAt: now() });
  account = { id: address, email: address };
  emit();
  return "ok";
}

export async function signOut(): Promise<void> {
  await wait();
  account = null;
  emit();
}

export async function changePassword(password: string): Promise<string | null> {
  await wait();
  return account && password ? null : "not signed in";
}

export async function checkIsAdmin(): Promise<boolean> {
  await wait(80);
  return Boolean(account && admins.some((admin) => admin.email === account?.email));
}

export async function fetchEntries(withAuthors: boolean): Promise<Entry[]> {
  await wait();
  return entries
    .map((entry) => (withAuthors ? { ...entry } : { ...entry, createdBy: null, updatedAt: null, updatedBy: null }))
    .sort(newestFirst);
}

export async function createEntry(input: EntryInput): Promise<Entry> {
  await wait();
  const email = adminEmail();
  const stamp = now();
  const entry: Entry = {
    id: newId(),
    ...clean(input),
    createdAt: stamp,
    createdBy: email,
    updatedAt: stamp,
    updatedBy: email,
  };
  entries.push(entry);
  return { ...entry };
}

export async function updateEntry(id: string, input: EntryInput): Promise<Entry> {
  await wait();
  const email = adminEmail();
  const index = entries.findIndex((entry) => entry.id === id);
  if (index < 0) throw new AppError("missing", "entry is gone");
  entries[index] = { ...entries[index], ...clean(input), updatedAt: now(), updatedBy: email };
  return { ...entries[index] };
}

export async function deleteEntry(id: string): Promise<void> {
  await wait();
  adminEmail();
  const before = entries.length;
  entries = entries.filter((entry) => entry.id !== id);
  if (entries.length === before) throw new AppError("missing", "entry is gone");
}

export async function fetchAdmins(): Promise<Admin[]> {
  await wait();
  adminEmail();
  return admins.map((admin) => ({ ...admin }));
}

export async function addAdmin(email: string): Promise<Admin> {
  await wait();
  adminEmail();
  const address = email.trim().toLowerCase();
  if (admins.some((admin) => admin.email === address)) throw new AppError("exists", "already an admin");
  const admin = { email: address, createdAt: now() };
  admins.push(admin);
  return { ...admin };
}

export async function removeAdmin(email: string): Promise<void> {
  await wait();
  if (email === adminEmail()) throw new AppError("forbidden", "admins cannot remove themselves");
  admins = admins.filter((admin) => admin.email !== email);
}

// keeps this file in step with src/lib/backend.ts: the type check fails if a function is missing or differs
type SameAsRealBackend<T extends typeof RealBackend> = T;
export type DemoBackend = SameAsRealBackend<typeof ThisFile>;
