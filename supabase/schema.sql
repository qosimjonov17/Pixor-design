-- Pixora: foydalanuvchilar va saqlangan ishlar.
-- Supabase → SQL Editor → New query → shu faylni to'liq joylab, "Run" bosing.
-- Qayta ishga tushirish xavfsiz (mavjud jadvallarga tegmaydi).

create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  telegram_id   text not null unique,
  name          text not null,
  username      text,
  picture       text,
  created_at    timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

create table if not exists public.saved_works (
  user_id    uuid not null references public.users (id) on delete cascade,
  work_id    text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, work_id)
);

create index if not exists saved_works_user_created_idx
  on public.saved_works (user_id, created_at desc);

-- Himoya: RLS yoqilgan, ochiq ruxsat (policy) yo'q.
-- Demak brauzerdan to'g'ridan-to'g'ri o'qib/yozib bo'lmaydi;
-- faqat sayt serveri (secret kalit bilan) ishlay oladi.
alter table public.users enable row level security;
alter table public.saved_works enable row level security;
