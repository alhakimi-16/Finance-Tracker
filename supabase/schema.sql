-- =============================================================================
-- VJSD7 Kassenbuch: database schema for Supabase
--
-- Everyone with the link can see the balance, the entries and the reports.
-- Only admins (the finance officer) sign in, and only they can add, change or
-- delete entries.
--
-- How to use it: Supabase dashboard -> SQL Editor -> New query -> paste this
-- whole file -> put your e-mail address in step 6 at the bottom -> Run.
-- Running it again later is safe: it only adds what is missing and keeps all data.
-- =============================================================================


-- 1. Admins: who may sign in and change entries --------------------------------

create table if not exists public.admins (
  email      text primary key check (email like '%_@_%'),
  created_at timestamptz not null default now()
);

create or replace function public.normalize_admin_email()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.email := lower(trim(new.email));
  return new;
end
$$;

drop trigger if exists normalize_admin_email on public.admins;
create trigger normalize_admin_email
  before insert or update on public.admins
  for each row execute function public.normalize_admin_email();


-- 2. Is the person who is signed in an admin? ----------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins a where a.email = lower(auth.jwt() ->> 'email')
  )
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;


-- 3. Entries: every euro that comes in or goes out -----------------------------

create table if not exists public.transactions (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('income', 'expense')),
  amount     numeric(12, 2) not null check (amount > 0),
  date       date not null default current_date,
  purpose    text not null check (length(trim(purpose)) between 1 and 200),
  category   text not null default 'other' check (length(category) between 1 and 40),
  comment    text not null default '' check (length(comment) <= 2000),
  created_at timestamptz not null default now(),
  created_by text,
  updated_at timestamptz not null default now(),
  updated_by text
);

create index if not exists transactions_date_idx on public.transactions (date desc, created_at desc);

-- who created / last changed an entry, set by the database (cannot be faked)
create or replace function public.stamp_transaction()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := coalesce(auth.jwt() ->> 'email', 'dashboard');
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;
  new.updated_at := now();
  new.updated_by := coalesce(auth.jwt() ->> 'email', 'dashboard');
  return new;
end
$$;

drop trigger if exists stamp_transaction on public.transactions;
create trigger stamp_transaction
  before insert or update on public.transactions
  for each row execute function public.stamp_transaction();


-- 4. History: every change is logged, so a deleted or edited entry can be
--    looked up and restored later

create table if not exists public.transaction_history (
  id             bigint generated always as identity primary key,
  transaction_id uuid not null,
  action         text not null check (action in ('insert', 'update', 'delete')),
  old_data       jsonb,
  new_data       jsonb,
  changed_at     timestamptz not null default now(),
  changed_by     text
);

create index if not exists transaction_history_transaction_idx
  on public.transaction_history (transaction_id, changed_at desc);

create or replace function public.log_transaction_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.transaction_history (transaction_id, action, new_data, changed_by)
    values (new.id, 'insert', to_jsonb(new), new.created_by);
  elsif tg_op = 'UPDATE' then
    insert into public.transaction_history (transaction_id, action, old_data, new_data, changed_by)
    values (new.id, 'update', to_jsonb(old), to_jsonb(new), new.updated_by);
  else
    insert into public.transaction_history (transaction_id, action, old_data, changed_by)
    values (old.id, 'delete', to_jsonb(old), coalesce(auth.jwt() ->> 'email', 'dashboard'));
  end if;
  return null;
end
$$;

revoke all on function public.log_transaction_change() from public, anon, authenticated;

drop trigger if exists log_transaction_change on public.transactions;
create trigger log_transaction_change
  after insert or update or delete on public.transactions
  for each row execute function public.log_transaction_change();


-- 5. Access rules (row level security) -----------------------------------------
--    Visitors without login may read the entries, but not who typed them in.
--    Admins may write. The history and the list of admins are for admins only.

alter table public.admins enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_history enable row level security;

revoke all on public.admins, public.transactions, public.transaction_history from anon, authenticated;
revoke all on sequence public.transaction_history_id_seq from anon, authenticated;
grant select (id, kind, amount, date, purpose, category, comment, created_at) on public.transactions to anon;
grant select, insert, update, delete on public.transactions to authenticated;
grant select on public.transaction_history to authenticated;
grant select, insert, delete on public.admins to authenticated;

drop policy if exists "everyone can read entries" on public.transactions;
create policy "everyone can read entries" on public.transactions
  for select to anon, authenticated
  using (true);

drop policy if exists "admins can add entries" on public.transactions;
create policy "admins can add entries" on public.transactions
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "admins can change entries" on public.transactions;
create policy "admins can change entries" on public.transactions
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "admins can delete entries" on public.transactions;
create policy "admins can delete entries" on public.transactions
  for delete to authenticated
  using ((select public.is_admin()));

drop policy if exists "admins can read the history" on public.transaction_history;
create policy "admins can read the history" on public.transaction_history
  for select to authenticated
  using ((select public.is_admin()));

-- admins see and manage the list, but cannot remove themselves (so nobody locks the door behind them)
drop policy if exists "admins can see admins" on public.admins;
create policy "admins can see admins" on public.admins
  for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "admins can add admins" on public.admins;
create policy "admins can add admins" on public.admins
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "admins can remove other admins" on public.admins;
create policy "admins can remove other admins" on public.admins
  for delete to authenticated
  using ((select public.is_admin()) and email <> lower((select auth.jwt()) ->> 'email'));


-- 6. YOUR ACCOUNT ---------------------------------------------------------------
--    Replace the address below with the e-mail you will sign in with.
--    (Later you can add more admins from inside the app.)

insert into public.admins (email)
values ('your.email@example.com')
on conflict (email) do nothing;
