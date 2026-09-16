-- Run this in the Supabase SQL editor. Cache for Yahoo Finance daily OHLCV
-- (sector ETFs, bonds, gold, oil, dollar index) -- written daily by
-- app/api/macro/refresh/route.ts (Vercel Cron), read publicly by the
-- Macro & Markets dashboard.

create table if not exists sector_prices (
  symbol text not null,
  date date not null,
  open numeric,
  high numeric,
  low numeric,
  close numeric,
  volume bigint,
  updated_at timestamptz not null default now(),
  constraint sector_prices_unique unique (symbol, date)
);

alter table sector_prices enable row level security;

create policy "Enable read access for all users"
  on sector_prices for select
  to anon
  using (true);
