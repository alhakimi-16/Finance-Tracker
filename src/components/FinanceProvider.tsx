"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import * as backend from "@/lib/backend";
import type { ConfigProblem } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { newestFirst } from "@/lib/ledger";
import type { Account, Entry, EntryInput } from "@/lib/types";

/**
 * Who is looking:
 * - "visitor": nobody signed in; can see everything, change nothing
 * - "admin": the finance officer; can add, change and delete
 * - "other": signed in, but not on the admin list (sees what visitors see)
 */
export type Viewer = "visitor" | "admin" | "other";

type AdminCheck = { accountId: string; isAdmin: boolean };
type EntriesResult = { entries: Entry[]; error: AppError | null };

type Finance = {
  locale: Locale;
  t: Dictionary;
  configured: boolean;
  /** what is wrong with the Supabase values from Vercel, if anything */
  configProblem: ConfigProblem | null;
  /** undefined while the saved login is being read */
  account: Account | undefined;
  /** undefined until known */
  viewer: Viewer | undefined;
  canEdit: boolean;
  /** newest first */
  entries: Entry[];
  entriesLoaded: boolean;
  entriesError: AppError | null;
  reloadEntries: () => Promise<void>;
  saveEntry: (input: EntryInput, id?: string) => Promise<Entry>;
  removeEntry: (id: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<"ok" | "wrong" | "failed">;
  signOut: () => Promise<void>;
};

const FinanceContext = createContext<Finance | null>(null);

/** Refresh the data when someone comes back to the tab after this long. */
const STALE_AFTER_MS = 60_000;

function asAppError(error: unknown): AppError {
  return error instanceof AppError ? error : new AppError("network", String(error));
}

export function FinanceProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const t = getDictionary(locale);
  const configProblem = backend.configProblem;
  const configured = configProblem === null;
  const [account, setAccount] = useState<Account | undefined>(undefined);
  const [adminCheck, setAdminCheck] = useState<AdminCheck | null>(null);
  const [entriesResult, setEntriesResult] = useState<EntriesResult | null>(null);
  const lastLoaded = useRef(0);
  const latestRequest = useRef(0);

  useEffect(() => {
    if (!configured) return;
    return backend.watchAccount((next) =>
      // a refreshed login token is the same person: keep the object, so nothing reloads
      setAccount((current) => (current && next && current.id === next.id ? current : next)),
    );
  }, [configured]);

  const accountId = account?.id ?? null;

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    backend.checkIsAdmin().then(
      (isAdmin) => !cancelled && setAdminCheck({ accountId, isAdmin }),
      // if the check fails, treat the person as a visitor rather than locking them out of reading
      () => !cancelled && setAdminCheck((current) => current ?? { accountId, isAdmin: false }),
    );
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  const viewer: Viewer | undefined =
    account === undefined
      ? undefined
      : account === null
        ? "visitor"
        : adminCheck?.accountId !== account.id
          ? undefined
          : adminCheck.isAdmin
            ? "admin"
            : "other";

  const loadEntries = useCallback(async (forViewer: Viewer) => {
    const request = ++latestRequest.current;
    try {
      const entries = await backend.fetchEntries(forViewer === "admin");
      if (request !== latestRequest.current) return;
      lastLoaded.current = Date.now();
      setEntriesResult({ entries, error: null });
    } catch (error) {
      if (request !== latestRequest.current) return;
      setEntriesResult((previous) => ({ entries: previous?.entries ?? [], error: asAppError(error) }));
    }
  }, []);

  useEffect(() => {
    if (configured && viewer) void loadEntries(viewer);
  }, [configured, viewer, loadEntries]);

  // someone may have changed something while this tab was in the background
  useEffect(() => {
    if (!configured || !viewer) return;
    const onVisible = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastLoaded.current < STALE_AFTER_MS) return;
      lastLoaded.current = Date.now();
      void loadEntries(viewer);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [configured, viewer, loadEntries]);

  const reloadEntries = useCallback(async () => {
    if (viewer) await loadEntries(viewer);
  }, [viewer, loadEntries]);

  const saveEntry = useCallback(async (input: EntryInput, id?: string) => {
    const saved = id ? await backend.updateEntry(id, input) : await backend.createEntry(input);
    setEntriesResult((previous) => ({
      entries: [saved, ...(previous?.entries ?? []).filter((e) => e.id !== saved.id)].sort(newestFirst),
      error: previous?.error ?? null,
    }));
    return saved;
  }, []);

  const removeEntry = useCallback(async (id: string) => {
    await backend.deleteEntry(id);
    setEntriesResult((previous) =>
      previous ? { ...previous, entries: previous.entries.filter((e) => e.id !== id) } : previous,
    );
  }, []);

  const signIn = useCallback((email: string, password: string) => backend.signIn(email, password), []);
  const signOut = useCallback(() => backend.signOut(), []);

  const value = useMemo<Finance>(
    () => ({
      locale,
      t,
      configured,
      configProblem,
      account,
      viewer,
      canEdit: viewer === "admin",
      entries: entriesResult?.entries ?? [],
      entriesLoaded: entriesResult !== null,
      entriesError: entriesResult?.error ?? null,
      reloadEntries,
      saveEntry,
      removeEntry,
      signIn,
      signOut,
    }),
    [
      locale,
      t,
      configured,
      configProblem,
      account,
      viewer,
      entriesResult,
      reloadEntries,
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
export function errorText(error: unknown, t: Dictionary): string {
  return error instanceof AppError ? (t.errors[error.kind] ?? t.errors.unknown) : t.errors.unknown;
}
