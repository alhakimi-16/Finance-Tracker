"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { AppError, createEntry, deleteEntry, fetchEntries, fetchMyRole, updateEntry } from "@/lib/api";
import { newestFirst } from "@/lib/ledger";
import { getSupabase, isConfigured, type Client } from "@/lib/supabase";
import type { Entry, EntryInput, Role } from "@/lib/types";

/** Where the visitor stands: each status gets its own screen (see Gate). */
export type Status = "loading" | "unconfigured" | "signed-out" | "role-error" | "no-access" | "ready";

type RoleResult = { userId: string; role: Role | null; failed: boolean };
type EntriesResult = { userId: string; entries: Entry[]; error: AppError | null };

type Finance = {
  locale: Locale;
  t: Dictionary;
  client: Client | null;
  status: Status;
  email: string | null;
  role: Role | null;
  canEdit: boolean;
  /** newest first */
  entries: Entry[];
  entriesLoaded: boolean;
  entriesError: AppError | null;
  reloadEntries: () => Promise<void>;
  retryRole: () => void;
  saveEntry: (input: EntryInput, id?: string) => Promise<Entry>;
  removeEntry: (id: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<"ok" | "wrong" | "failed">;
  signOut: () => Promise<void>;
};

const FinanceContext = createContext<Finance | null>(null);

/** Refresh the data when someone comes back to the tab after this long. */
const STALE_AFTER_MS = 60_000;

function asAppError(error: unknown): AppError {
  return error instanceof AppError ? error : new AppError("unknown", String(error));
}

export function FinanceProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const t = getDictionary(locale);
  const [client] = useState(getSupabase);
  // undefined = not known yet (Supabase reads the saved login on start)
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [roleResult, setRoleResult] = useState<RoleResult | null>(null);
  const [entriesResult, setEntriesResult] = useState<EntriesResult | null>(null);
  const [roleAttempt, setRoleAttempt] = useState(0);
  const lastLoaded = useRef(0);

  const userId = session?.user.id ?? null;
  const email = session?.user.email ?? null;

  useEffect(() => {
    if (!client) return;
    const { data } = client.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, [client]);

  useEffect(() => {
    if (!client || !userId) return;
    let cancelled = false;
    fetchMyRole(client).then(
      (role) => !cancelled && setRoleResult({ userId, role, failed: false }),
      // a failed re-check (say, right after the laptop wakes up) keeps the role we already know
      () =>
        !cancelled &&
        setRoleResult((previous) =>
          previous?.userId === userId && !previous.failed ? previous : { userId, role: null, failed: true },
        ),
    );
    return () => {
      cancelled = true;
    };
  }, [client, userId, roleAttempt]);

  const roleForUser = roleResult?.userId === userId ? roleResult : null;
  const role = roleForUser?.role ?? null;

  let status: Status;
  if (!isConfigured) status = "unconfigured";
  else if (session === undefined) status = "loading";
  else if (!session) status = "signed-out";
  else if (!roleForUser) status = "loading";
  else if (roleForUser.failed) status = "role-error";
  else if (!role) status = "no-access";
  else status = "ready";

  const loadEntries = useCallback(
    async (forUser: string) => {
      if (!client) return;
      try {
        const entries = await fetchEntries(client);
        lastLoaded.current = Date.now();
        setEntriesResult({ userId: forUser, entries, error: null });
      } catch (error) {
        setEntriesResult((previous) => ({
          userId: forUser,
          entries: previous?.userId === forUser ? previous.entries : [],
          error: asAppError(error),
        }));
      }
    },
    [client],
  );

  const ready = status === "ready";

  useEffect(() => {
    if (ready && userId) void loadEntries(userId);
  }, [ready, userId, loadEntries]);

  // someone else may have changed something while the tab was in the background
  useEffect(() => {
    if (!ready || !userId) return;
    const onVisible = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastLoaded.current < STALE_AFTER_MS) return;
      lastLoaded.current = Date.now();
      setRoleAttempt((n) => n + 1);
      void loadEntries(userId);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [ready, userId, loadEntries]);

  const entriesForUser = entriesResult?.userId === userId ? entriesResult : null;

  const reloadEntries = useCallback(async () => {
    if (userId) await loadEntries(userId);
  }, [userId, loadEntries]);

  const retryRole = useCallback(() => setRoleAttempt((n) => n + 1), []);

  const saveEntry = useCallback(
    async (input: EntryInput, id?: string) => {
      if (!client || !userId) throw new AppError("unknown", "not signed in");
      const saved = id ? await updateEntry(client, id, input) : await createEntry(client, input);
      setEntriesResult((previous) =>
        previous?.userId === userId
          ? { ...previous, entries: [saved, ...previous.entries.filter((e) => e.id !== saved.id)].sort(newestFirst) }
          : previous,
      );
      return saved;
    },
    [client, userId],
  );

  const removeEntry = useCallback(
    async (id: string) => {
      if (!client || !userId) throw new AppError("unknown", "not signed in");
      await deleteEntry(client, id);
      setEntriesResult((previous) =>
        previous?.userId === userId ? { ...previous, entries: previous.entries.filter((e) => e.id !== id) } : previous,
      );
    },
    [client, userId],
  );

  const signIn = useCallback(
    async (emailInput: string, password: string) => {
      if (!client) return "failed" as const;
      const { error } = await client.auth.signInWithPassword({ email: emailInput.trim(), password });
      if (!error) return "ok" as const;
      return error.code === "invalid_credentials" ? ("wrong" as const) : ("failed" as const);
    },
    [client],
  );

  const signOut = useCallback(async () => {
    if (!client) return;
    // "local" signs out this browser only, not every device of the account
    await client.auth.signOut({ scope: "local" });
    setEntriesResult(null);
    setRoleResult(null);
  }, [client]);

  const value = useMemo<Finance>(
    () => ({
      locale,
      t,
      client,
      status,
      email,
      role,
      canEdit: status === "ready" && role === "admin",
      entries: entriesForUser?.entries ?? [],
      entriesLoaded: entriesForUser !== null,
      entriesError: entriesForUser?.error ?? null,
      reloadEntries,
      retryRole,
      saveEntry,
      removeEntry,
      signIn,
      signOut,
    }),
    [
      locale,
      t,
      client,
      status,
      email,
      role,
      entriesForUser,
      reloadEntries,
      retryRole,
      saveEntry,
      removeEntry,
      signIn,
      signOut,
    ],
  );

  return <FinanceContext value={value}>{children}</FinanceContext>;
}

export function useFinance(): Finance {
  const finance = useContext(FinanceContext);
  if (!finance) throw new Error("useFinance must be used inside <FinanceProvider>");
  return finance;
}

/** Translate an AppError into a sentence for people. */
export function errorText(error: AppError, t: Dictionary): string {
  return t.errors[error.kind] ?? t.errors.unknown;
}
