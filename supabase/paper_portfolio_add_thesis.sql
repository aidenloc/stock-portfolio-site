-- Run this in the Supabase SQL editor. Adds a free-text investment thesis
-- per holding, editable from /admin and shown as an expandable row on the
-- public homepage's holdings table.

alter table paper_portfolio add column if not exists thesis text;
