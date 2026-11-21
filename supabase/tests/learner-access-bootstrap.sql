-- Disposable Postgres fixture for CI only. Never applied to Supabase production.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (
  id uuid primary key,
  email text,
  email_confirmed_at timestamptz,
  raw_app_meta_data jsonb not null default '{}'::jsonb
);

create or replace function auth.uid()
returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create or replace function auth.jwt()
returns jsonb
language sql stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
$$;

grant execute on function auth.jwt() to anon, authenticated, service_role;

create table public.profiles (
  id uuid primary key references auth.users(id),
  display_name text not null default '',
  vehicle text not null default 'light',
  created_at timestamptz not null default now()
);
create table public.question_attempts (
  id uuid primary key,
  user_id uuid not null references auth.users(id),
  question_id text not null,
  category smallint not null,
  correct boolean not null,
  created_at timestamptz not null default now()
);
create table public.test_attempts (
  id uuid primary key,
  user_id uuid not null references auth.users(id),
  mode text not null,
  results jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.question_attempts enable row level security;
alter table public.test_attempts enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy question_attempts_select_own on public.question_attempts for select to authenticated using (user_id = auth.uid());
create policy question_attempts_insert_own on public.question_attempts for insert to authenticated with check (user_id = auth.uid());
create policy test_attempts_select_own on public.test_attempts for select to authenticated using (user_id = auth.uid());
create policy test_attempts_insert_own on public.test_attempts for insert to authenticated with check (user_id = auth.uid());

grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant select, insert, update, delete, truncate on public.profiles, public.question_attempts, public.test_attempts to anon, authenticated;
grant all on all tables in schema public to service_role;

insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data) values
 ('11111111-1111-4111-8111-111111111111','aiamplifysa@gmail.com',now(),'{"provider":"email","providers":["email"]}'),
 ('22222222-2222-4222-8222-222222222222','learner@example.com',now(),'{"provider":"google","providers":["google"]}'),
 ('33333333-3333-4333-8333-333333333333','other@example.com',now(),'{"provider":"google","providers":["google"]}'),
 ('44444444-4444-4444-8444-444444444444','admin@example.com',now(),'{"provider":"google","providers":["google"]}'),
 ('55555555-5555-4555-8555-555555555555','unverified@example.com',null,'{"provider":"google","providers":["google"]}');
