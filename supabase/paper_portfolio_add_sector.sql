-- Run this in the Supabase SQL editor. Adds sector/industry caching to
-- paper_portfolio so the app only calls Finnhub's profile endpoint once per
-- ticker (at add-time, or a one-time backfill for older rows) instead of on
-- every page load.

alter table paper_portfolio add column if not exists sector text;
