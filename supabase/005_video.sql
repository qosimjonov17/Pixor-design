-- Pixora: videoli ishlar (5-qadam). X'dagi video/GIF postlar uchun.
-- Supabase → SQL Editor → New query → shu faylni joylab, "Run" bosing. Qayta ishga tushirish xavfsiz.

alter table public.works add column if not exists video_url  text;
alter table public.works add column if not exists video_path text;
-- 'animation' — ovozsiz, GIF kabi o'zi o'ynaydi; 'video' — ovozli
alter table public.works add column if not exists video_kind text check (video_kind in ('animation', 'video'));
alter table public.works add column if not exists video_size bigint;

notify pgrst, 'reload schema';
