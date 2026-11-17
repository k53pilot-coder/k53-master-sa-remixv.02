-- Reproducible learner-data schema and row-level security.
-- Safe to re-run: tables are created only when absent; policies are replaced by name.
-- Back up the existing Supabase project before applying migrations.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  vehicle text not null default 'light'
    check (vehicle in ('light', 'heavy', 'motorcycle')),
  created_at timestamptz not null default now()
);

create table if not exists public.question_attempts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null check (char_length(question_id) <= 100),
  category smallint not null check (category between 0 and 7),
  correct boolean not null,
  created_at timestamptz not null default now()
);

create table if not exists public.test_attempts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('practice', 'mock')),
  results jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists question_attempts_user_created_at_idx
  on public.question_attempts (user_id, created_at);
create index if not exists test_attempts_user_created_at_idx
  on public.test_attempts (user_id, created_at);

alter table public.profiles enable row level security;
alter table public.question_attempts enable row level security;
alter table public.test_attempts enable row level security;

grant select, insert, update on public.profiles to authenticated;
grant select, insert on public.question_attempts to authenticated;
grant select, insert on public.test_attempts to authenticated;
grant all on public.profiles, public.question_attempts, public.test_attempts to service_role;

-- Supabase combines permissive policies with OR. Inspect pg_policies after applying and
-- remove any legacy permissive policy that grants broader access than these owner rules.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "question_attempts_select_own" on public.question_attempts;
create policy "question_attempts_select_own" on public.question_attempts
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "question_attempts_insert_own" on public.question_attempts;
create policy "question_attempts_insert_own" on public.question_attempts
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "test_attempts_select_own" on public.test_attempts;
create policy "test_attempts_select_own" on public.test_attempts
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "test_attempts_insert_own" on public.test_attempts;
create policy "test_attempts_insert_own" on public.test_attempts
  for insert to authenticated with check (user_id = (select auth.uid()));

create or replace function public.create_learner_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.create_learner_profile() from public, anon, authenticated;
grant execute on function public.create_learner_profile() to service_role;

drop trigger if exists create_learner_profile on auth.users;
create trigger create_learner_profile
  after insert on auth.users
  for each row execute function public.create_learner_profile();

insert into public.profiles (id, display_name)
select id, coalesce(raw_user_meta_data ->> 'display_name', '')
from auth.users
on conflict (id) do nothing;
