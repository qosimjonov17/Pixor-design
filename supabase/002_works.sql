-- Pixora: bot orqali qo'shiladigan ishlar (2-qadam).
-- Supabase → SQL Editor → New query → shu faylni to'liq joylab, "Run" bosing.
-- Qayta ishga tushirish xavfsiz.

create table if not exists public.works (
  id                  uuid primary key default gen_random_uuid(),
  source_url          text not null unique,
  platform            text not null check (platform in ('x', 'behance', 'dprofile', 'dribbble')),
  title               text not null default '',
  description         text,
  image_url           text,
  image_path          text,
  designer_name       text not null default '',
  designer_handle     text,
  status              text not null default 'draft' check (status in ('draft', 'published', 'rejected')),
  created_by_tg       bigint,
  channel_message_id  bigint,
  created_at          timestamptz not null default now(),
  published_at        timestamptz
);

create index if not exists works_published_idx
  on public.works (published_at desc) where status = 'published';

-- Bot suhbat holati: admin hozir nimani yuborishi kutilyapti (masalan, yangi nom yoki rasm)
create table if not exists public.bot_state (
  tg_user_id  bigint primary key,
  work_id     uuid references public.works (id) on delete cascade,
  awaiting    text check (awaiting in ('title', 'designer', 'description', 'image')),
  updated_at  timestamptz not null default now()
);

alter table public.works enable row level security;
alter table public.bot_state enable row level security;

-- Muqova rasmlari uchun ochiq (faqat o'qish) saqlash joyi
insert into storage.buckets (id, name, public)
values ('works', 'works', true)
on conflict (id) do nothing;

-- API jadvallarni darhol ko'rishi uchun
notify pgrst, 'reload schema';
