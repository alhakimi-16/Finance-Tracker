import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** The tables of supabase/schema.sql, as supabase-js sees them. */
export type Database = {
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
        Insert: {
          kind: "income" | "expense";
          amount: string;
          date: string;
          purpose: string;
          category: string;
          comment: string;
        };
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
      members: {
        Row: { email: string; role: "admin" | "viewer"; created_at: string };
        Insert: { email: string; role: "admin" | "viewer" };
        Update: { role?: "admin" | "viewer" };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { my_role: { Args: never; Returns: string | null } };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Client = SupabaseClient<Database>;

// Referenced literally so Next.js can inline them into the browser bundle at build time.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && key);

let client: Client | null = null;

/** The browser's Supabase client (keeps the login in localStorage). Null on the server or without config. */
export function getSupabase(): Client | null {
  if (!url || !key || typeof window === "undefined") return null;
  client ??= createClient<Database>(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}
