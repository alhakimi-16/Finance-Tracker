<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project notes

- Finance tracker ("Kassenbuch") for VJSD Zweigstelle 7, in German (`/de`) and Arabic (`/ar`, right-to-left).
- Data and login live in Supabase; the browser talks to it directly with supabase-js. All access rules are
  row level security in `supabase/schema.sql` (admins write, viewers read, nobody else sees anything).
  Changing the schema means updating that file so it still runs cleanly a second time.
- Every user-facing text is in `src/i18n/dictionaries.ts`, in both languages. Never hard-code text in components.
- Amounts are whole cents (integers) in the app and `numeric(12, 2)` in the database; see `src/lib/money.ts`.
- Use logical CSS (`ms-`, `pe-`, `text-start`, `rtl:`) so layouts mirror in Arabic.
- `npm run check` runs lint, typecheck and build.
