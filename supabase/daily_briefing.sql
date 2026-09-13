-- Run this in the Supabase SQL editor. Single-row cache (id=1) for the
-- daily news briefing — written once a day by a Vercel Cron job
-- (app/api/cron/daily-briefing/route.ts), read publicly on the homepage.

create table if not exists daily_briefing (
  id bigint primary key default 1,
  briefing_date date not null,
  content jsonb not null,
  updated_at timestamptz not null default now(),
  constraint daily_briefing_single_row check (id = 1)
);

alter table daily_briefing enable row level security;

create policy "Enable read access for all users"
  on daily_briefing for select
  to anon
  using (true);
