-- Kategoriyalar: Case, UI, Branding. Bitta ish bir nechta kategoriyada bo'lishi mumkin.
alter table public.works
  add column if not exists categories text[] not null default '{}';

alter table public.works drop constraint if exists works_categories_check;
alter table public.works
  add constraint works_categories_check
  check (categories <@ array['case', 'ui', 'branding']::text[]);

create index if not exists works_categories_idx on public.works using gin (categories);

-- Eski ishlar: Behance → Case, qolganlari → UI (keyin botda tuzatsa bo'ladi)
update public.works set categories = array['case'] where categories = '{}' and platform = 'behance';
update public.works set categories = array['ui'] where categories = '{}' and platform <> 'behance';

notify pgrst, 'reload schema';
