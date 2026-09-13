-- Run this in the Supabase SQL editor. Adds an adjustable transparency level
-- for dashboard cards (0-100), so the ambient background gradient can show
-- through them, matching the "glassy" card look in Finary's own screenshots.

alter table site_settings add column if not exists card_opacity integer;
