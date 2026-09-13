-- Run this in the Supabase SQL editor. Adds an optional card-surface color
-- so the Finary-inspired card layout can sit on a tone distinct from the page
-- background, while staying admin-customizable (see ThemeEditor.tsx).
-- Left null by default: app/layout.tsx falls back to a CSS color-mix() shade
-- derived from background_color, so nothing looks broken until an admin
-- explicitly picks one.

alter table site_settings add column if not exists card_background_color text;
