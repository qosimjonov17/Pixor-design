-- Pixora: bot uchun kichik sozlamalar ombori (3-qadam).
-- Supabase → SQL Editor → New query → shu faylni joylab, "Run" bosing. Qayta ishga tushirish xavfsiz.

create table if not exists public.bot_kv (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz not null default now()
);

alter table public.bot_kv enable row level security;

notify pgrst, 'reload schema';
