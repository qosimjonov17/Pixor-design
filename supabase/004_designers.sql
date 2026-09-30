-- Pixora: dizaynerlar (4-qadam). Har bir ish bitta dizaynerga bog'lanadi,
-- shunda dizayner sahifasida uning barcha ishlari chiqadi.
-- Supabase → SQL Editor → New query → shu faylni to'liq joylab, "Run" bosing. Qayta ishga tushirish xavfsiz.

create table if not exists public.designers (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  platform     text check (platform in ('x', 'behance', 'dprofile', 'dribbble')),
  -- Dizaynerning platformadagi profili (masalan https://www.behance.net/rondesignlab) — takrorlanmaydi
  profile_url  text unique,
  handle       text,
  avatar_url   text,
  avatar_path  text,
  created_at   timestamptz not null default now()
);

alter table public.designers enable row level security;

alter table public.works add column if not exists designer_id uuid references public.designers (id) on delete set null;
create index if not exists works_designer_idx on public.works (designer_id) where status = 'published';

-- Oldin qo'shilgan ishlar: dizayner ismi bo'yicha dizaynerlar yaratib, bog'lab qo'yamiz
insert into public.designers (slug, name, platform)
select distinct on (lower(trim(designer_name)))
  coalesce(nullif(trim(both '-' from lower(regexp_replace(trim(designer_name), '[^a-zA-Z0-9]+', '-', 'g'))), ''), 'dizayner')
    || '-' || substr(md5(lower(trim(designer_name))), 1, 4),
  trim(designer_name),
  platform
from public.works
where designer_id is null and trim(designer_name) <> ''
on conflict (slug) do nothing;

update public.works w
set designer_id = d.id
from public.designers d
where w.designer_id is null and lower(trim(w.designer_name)) = lower(d.name);

notify pgrst, 'reload schema';
