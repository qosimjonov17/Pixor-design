-- Dizayner profili: bio va boshqa platformalardagi havolalar
alter table public.designers add column if not exists bio text;
alter table public.designers add column if not exists links jsonb not null default '{}'::jsonb;

-- Bot: dizayner bio/havolasini tahrirlash holati
alter table public.bot_state add column if not exists designer_id uuid references public.designers (id) on delete cascade;
alter table public.bot_state drop constraint if exists bot_state_awaiting_check;
alter table public.bot_state
  add constraint bot_state_awaiting_check
  check (awaiting in ('title', 'designer', 'description', 'image', 'designer_bio', 'designer_link'));

notify pgrst, 'reload schema';
