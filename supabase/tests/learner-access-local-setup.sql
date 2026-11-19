-- Existing K53 learner tables for disposable local Supabase integration.
-- Supabase provides auth.users, auth.uid(), auth.jwt(), GoTrue and PostgREST.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  vehicle text not null default 'light' check (vehicle in ('light','heavy','motorcycle')),
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
  mode text not null check (mode in ('practice','mock')),
  results jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.question_attempts enable row level security;
alter table public.test_attempts enable row level security;
create policy select_own on public.profiles for select to authenticated using (id = auth.uid());
create policy insert_own on public.profiles for insert to authenticated with check (id = auth.uid());
create policy update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy select_own on public.question_attempts for select to authenticated using (user_id = auth.uid());
create policy insert_own on public.question_attempts for insert to authenticated with check (user_id = auth.uid());
create policy select_own on public.test_attempts for select to authenticated using (user_id = auth.uid());
create policy insert_own on public.test_attempts for insert to authenticated with check (user_id = auth.uid());
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete, truncate on public.profiles, public.question_attempts, public.test_attempts to anon, authenticated;
grant all on public.profiles, public.question_attempts, public.test_attempts to service_role;
