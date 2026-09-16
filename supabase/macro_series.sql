-- Run this in the Supabase SQL editor. Cache for FRED macro series (real GDP,
-- CPI, unemployment, fed funds, Treasury yields) -- written daily by
-- app/api/macro/refresh/route.ts (Vercel Cron), read publicly by the
-- Macro & Markets dashboard.

create table if not exists macro_series (
  series_id text not null,
  date date not null,
  value numeric not null,
  updated_at timestamptz not null default now(),
  constraint macro_series_unique unique (series_id, date)
);

alter table macro_series enable row level security;

create policy "Enable read access for all users"
  on macro_series for select
  to anon
  using (true);
