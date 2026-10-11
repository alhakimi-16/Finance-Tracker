/** What is wrong with the two Supabase values from Vercel, if anything; the setup screen explains each case. */
export type ConfigProblem = "missing-url" | "missing-key" | "swapped" | "secret-key" | "bad-url" | "bad-key";

export type Config = { url: string; key: string; problem: null } | { url: null; key: null; problem: ConfigProblem };

/** Undoes common pasting mistakes: spaces, quotes, or the whole `.env` line as the value. */
function clean(raw: string | undefined): string {
  return (raw ?? "")
    .trim()
    .replace(/^NEXT_PUBLIC_[A-Z_]*\s*=\s*/, "")
    .replace(/^(["'])(.*)\1$/, "$2")
    .trim();
}

/** The project's API address, also when given without "https://" or as the dashboard address. */
function projectUrl(value: string): string | null {
  const dashboard = /supabase\.com\/dashboard\/project\/([a-z0-9]+)/i.exec(value);
  if (dashboard) return `https://${dashboard[1].toLowerCase()}.supabase.co`;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.hostname.includes(".") || url.hostname === "localhost" ? url.origin : null;
  } catch {
    return null;
  }
}

/** The role inside an old-style key (a JWT): "anon" may be public, "service_role" never. */
function jwtRole(key: string): unknown {
  try {
    const payload = key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "="))).role;
  } catch {
    return undefined;
  }
}

/** Checks the values before anything connects with them: a malformed address would otherwise crash the page. */
export function readConfig(rawUrl: string | undefined, rawKey: string | undefined): Config {
  const value = clean(rawUrl);
  const key = clean(rawKey);
  const fail = (problem: ConfigProblem): Config => ({ url: null, key: null, problem });
  if (!value) return fail("missing-url");
  if (!key) return fail("missing-key");
  // a secret key in either field is public now (both are built into the page): it must be replaced
  if ([value, key].some((v) => v.startsWith("sb_secret_") || jwtRole(v) === "service_role")) return fail("secret-key");
  if (/^(sb_|eyJ)/.test(value) || /^https?:\/\//i.test(key)) return fail("swapped");
  // spaces or other characters a request header cannot carry
  if (!/^[!-~]+$/.test(key)) return fail("bad-key");
  const url = projectUrl(value);
  return url ? { url, key, problem: null } : fail("bad-url");
}
