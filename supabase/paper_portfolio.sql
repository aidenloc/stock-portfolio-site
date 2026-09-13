-- Run this in the Supabase SQL editor (Table Editor doesn't do RLS policies well).
-- Mirrors the `portfolio` table's RLS pattern: public read, writes only via
-- the service_role key from server-side admin API routes.

create table if not exists paper_portfolio (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  ticker text not null,
  shares numeric not null,
  entry_price numeric not null,
  entry_date date not null
);

alter table paper_portfolio enable row level security;

create policy "Enable read access for all users"
  on paper_portfolio for select
  to anon
  using (true);
