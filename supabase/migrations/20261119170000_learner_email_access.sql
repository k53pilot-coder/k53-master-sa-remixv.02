-- Learner email authorisation for K53 Master SA.
-- This migration is applied only after development-branch/local verification.
-- It intentionally does not modify administrator role claims or policy.

create table if not exists public.learner_access (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid null,
  status text not null default 'active',
  created_by uuid null references auth.users(id) on delete set null,
  updated_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learner_access_email_normalized_check
    check (email <> '' and email = lower(btrim(email))),
  constraint learner_access_status_check
    check (status in ('active', 'disabled'))
);

create unique index if not exists learner_access_email_uidx
  on public.learner_access (email);

create unique index if not exists learner_access_user_id_uidx
  on public.learner_access (user_id)
  where user_id is not null;

create index if not exists learner_access_status_created_at_idx
  on public.learner_access (status, created_at desc);

alter table public.learner_access enable row level security;

revoke all on table public.learner_access from anon, authenticated;
grant select on table public.learner_access to authenticated;
grant select, insert, update on table public.learner_access to service_role;

drop policy if exists learner_access_select_own on public.learner_access;
create policy learner_access_select_own
  on public.learner_access
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- First-time linking is atomic and can only be requested by an authenticated
-- Supabase session. The server middleware verifies the signed bearer JWT, and
-- this function resolves the email and UUID from auth.uid()/auth.users only.
create or replace function public.claim_learner_access()
returns table (access_status text)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_email_confirmed_at timestamptz;
  v_app_metadata jsonb;
  v_access public.learner_access%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  -- Resolve identity from the Supabase Auth catalogue, not from client input
  -- or user-editable metadata. A verified email is mandatory.
  select u.email, u.email_confirmed_at, u.raw_app_meta_data
    into v_email, v_email_confirmed_at, v_app_metadata
    from auth.users u
    where u.id = v_user_id;

  if not found or v_email is null or v_email_confirmed_at is null then
    return query select 'unverified'::text;
    return;
  end if;

  -- A verified email/password identity alone is not sufficient. Require a
  -- Google identity recorded by GoTrue in trusted app_metadata. A linked
  -- account remains eligible when Google appears in its providers array.
  if not coalesce(
    (v_app_metadata ->> 'provider') = 'google'
    or (v_app_metadata -> 'providers') ? 'google',
    false
  ) then
    return query select 'google_required'::text;
    return;
  end if;

  v_email := pg_catalog.lower(pg_catalog.btrim(v_email));

  -- An existing UUID binding takes precedence over email. An email change
  -- must not silently transfer or discard the original authorisation.
  select *
    into v_access
    from public.learner_access
    where user_id = v_user_id
    for update;

  if found then
    return query
      select case when v_access.status = 'active' then 'active' else 'disabled' end;
    return;
  end if;

  select *
    into v_access
    from public.learner_access
    where email = v_email
    for update;

  if not found or v_access.status <> 'active' or v_access.user_id is not null then
    return query select
      case when found and v_access.status = 'disabled' then 'disabled' else 'pending' end;
    return;
  end if;

  begin
    update public.learner_access
       set user_id = v_user_id,
           updated_at = pg_catalog.now()
     where id = v_access.id
       and user_id is null
       and status = 'active';

    if not found then
      return query select 'pending'::text;
      return;
    end if;

    return query select 'active'::text;
    return;
  exception
    when unique_violation then
      return query select 'pending'::text;
      return;
  end;
end;
$function$;

revoke all on function public.claim_learner_access() from public, anon;
grant execute on function public.claim_learner_access() to authenticated, service_role;

-- RLS permissive policies combine with OR. Replace the known legacy policies
-- and add restrictive guards: the guards combine with AND, so another
-- permissive policy cannot bypass ownership or active authorisation.
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
-- Also remove the shorter names used by earlier disposable test schemas.
drop policy if exists select_own on public.profiles;
drop policy if exists insert_own on public.profiles;
drop policy if exists update_own on public.profiles;

create policy select_own
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    and exists (
      select 1 from public.learner_access la
      where la.user_id = (select auth.uid()) and la.status = 'active'
    )
  );

create policy insert_own
  on public.profiles for insert to authenticated
  with check (
    id = (select auth.uid())
    and exists (
      select 1 from public.learner_access la
      where la.user_id = (select auth.uid()) and la.status = 'active'
    )
  );

create policy update_own
  on public.profiles for update to authenticated
  using (
    id = (select auth.uid())
    and exists (
      select 1 from public.learner_access la
      where la.user_id = (select auth.uid()) and la.status = 'active'
    )
  )
  with check (
    id = (select auth.uid())
    and exists (
      select 1 from public.learner_access la
      where la.user_id = (select auth.uid()) and la.status = 'active'
    )
  );

drop policy if exists question_attempts_select_own on public.question_attempts;
drop policy if exists question_attempts_insert_own on public.question_attempts;
drop policy if exists select_own on public.question_attempts;
drop policy if exists insert_own on public.question_attempts;

create policy select_own
  on public.question_attempts for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.learner_access la
      where la.user_id = (select auth.uid()) and la.status = 'active'
    )
  );

create policy insert_own
  on public.question_attempts for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.learner_access la
      where la.user_id = (select auth.uid()) and la.status = 'active'
    )
  );

drop policy if exists test_attempts_select_own on public.test_attempts;
drop policy if exists test_attempts_insert_own on public.test_attempts;
drop policy if exists select_own on public.test_attempts;
drop policy if exists insert_own on public.test_attempts;

create policy select_own
  on public.test_attempts for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.learner_access la
      where la.user_id = (select auth.uid()) and la.status = 'active'
    )
  );

create policy insert_own
  on public.test_attempts for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.learner_access la
      where la.user_id = (select auth.uid()) and la.status = 'active'
    )
  );

-- Restrictive guards enforce ownership and active authorisation even if
-- another permissive policy is added to one of these tables in the future.
drop policy if exists profiles_learner_access_guard on public.profiles;
create policy profiles_learner_access_guard
  on public.profiles as restrictive
  for all to authenticated
  using (
    id = (select auth.uid())
    and exists (
      select 1 from public.learner_access la
      where la.user_id = (select auth.uid()) and la.status = 'active'
    )
  )
  with check (
    id = (select auth.uid())
    and exists (
      select 1 from public.learner_access la
      where la.user_id = (select auth.uid()) and la.status = 'active'
    )
  );

drop policy if exists question_attempts_learner_access_guard on public.question_attempts;
create policy question_attempts_learner_access_guard
  on public.question_attempts as restrictive
  for all to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.learner_access la
      where la.user_id = (select auth.uid()) and la.status = 'active'
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.learner_access la
      where la.user_id = (select auth.uid()) and la.status = 'active'
    )
  );

drop policy if exists test_attempts_learner_access_guard on public.test_attempts;
create policy test_attempts_learner_access_guard
  on public.test_attempts as restrictive
  for all to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.learner_access la
      where la.user_id = (select auth.uid()) and la.status = 'active'
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.learner_access la
      where la.user_id = (select auth.uid()) and la.status = 'active'
    )
  );

-- RLS does not protect TRUNCATE. Remove the excess table privileges observed
-- in the existing production grants while preserving legitimate operations.
-- Remove all direct table privileges from anonymous visitors. RLS is
-- still enabled, but privilege revocation provides an additional boundary.
revoke all on table public.profiles,
  public.question_attempts, public.test_attempts
  from anon;

-- Authenticated learners receive only the operations used by the application.
-- Remove any legacy REFERENCES/TRIGGER grants as well as DELETE/TRUNCATE.
revoke all on table public.profiles,
  public.question_attempts, public.test_attempts
  from authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert on table public.question_attempts to authenticated;
grant select, insert on table public.test_attempts to authenticated;


-- Administrative functions use the caller's signed Supabase JWT. The private
-- helper mirrors src/lib/admin-role.ts: fixed owner email, or Google identity
-- plus an admin/owner role in trusted app_metadata. User metadata is never used.
create schema k53_learner_access_private;
revoke all on schema k53_learner_access_private from public, anon, authenticated;

create or replace function k53_learner_access_private.is_current_user_k53_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select case
    when auth.uid() is null then false
    when exists (
      select 1
      from auth.users u
      where u.id = auth.uid()
        and pg_catalog.lower(pg_catalog.btrim(u.email)) = 'aiamplifysa@gmail.com'
        and u.email_confirmed_at is not null
    ) then true
    else
      (
        coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') = 'google'
        or coalesce(auth.jwt() -> 'app_metadata' -> 'providers', '[]'::jsonb) ? 'google'
        or case
          when pg_catalog.jsonb_typeof(auth.jwt() -> 'identities') = 'array' then exists (
            select 1
            from pg_catalog.jsonb_array_elements(auth.jwt() -> 'identities') as identity_rows(item)
            where item ->> 'provider' = 'google'
          )
          else false
        end
      )
      and
      (
        coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'owner')
        or coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb) ?| array['admin', 'owner']
      )
  end;
$function$;

revoke all on function k53_learner_access_private.is_current_user_k53_admin() from public, anon, authenticated;

-- Administrative operations are RPC-only. They verify authorization inside
-- the database as well as through the server's requireAdmin middleware.
create or replace function public.admin_add_learner_access(p_email text)
returns table (record_id uuid, result_status text)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_email text := pg_catalog.lower(pg_catalog.btrim(p_email));
  v_id uuid;
  v_status text;
  v_actor uuid := auth.uid();
begin
  if not k53_learner_access_private.is_current_user_k53_admin() then
    raise exception 'Forbidden: Admin access is required' using errcode = '42501';
  end if;

  if v_email = '' or pg_catalog.length(v_email) > 254
     or v_email !~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$' then
    raise exception 'Invalid email address' using errcode = '22023';
  end if;

  insert into public.learner_access(email, status, created_by, updated_by)
  values (v_email, 'active', v_actor, v_actor)
  on conflict (email) do nothing
  returning id into v_id;

  if v_id is not null then
    return query select v_id, 'created'::text;
    return;
  end if;

  select id, status into v_id, v_status
    from public.learner_access
    where email = v_email;

  return query select v_id,
    case when v_status = 'active' then 'already_active' else 'disabled_exists' end;
end;
$function$;

create or replace function public.admin_list_learner_access(p_search text default '')
returns table (
  id uuid,
  email text,
  user_id uuid,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not k53_learner_access_private.is_current_user_k53_admin() then
    raise exception 'Forbidden: Admin access is required' using errcode = '42501';
  end if;

  return query
    select la.id, la.email, la.user_id, la.status, la.created_at, la.updated_at
    from public.learner_access la
    where p_search is null
       or p_search = ''
       or la.email like '%' || pg_catalog.lower(pg_catalog.btrim(p_search)) || '%'
    order by la.created_at desc
    limit 500;
end;
$function$;

create or replace function public.admin_set_learner_access_status(
  p_id uuid,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not k53_learner_access_private.is_current_user_k53_admin() then
    raise exception 'Forbidden: Admin access is required' using errcode = '42501';
  end if;

  if p_status not in ('active', 'disabled') then
    raise exception 'Invalid learner access status' using errcode = '22023';
  end if;

  update public.learner_access
     set status = p_status,
         updated_by = auth.uid(),
         updated_at = pg_catalog.now()
   where id = p_id;

  return found;
end;
$function$;

revoke all on function public.admin_add_learner_access(text) from public, anon, authenticated;
revoke all on function public.admin_list_learner_access(text) from public, anon, authenticated;
revoke all on function public.admin_set_learner_access_status(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_add_learner_access(text) to authenticated;
grant execute on function public.admin_list_learner_access(text) to authenticated;
grant execute on function public.admin_set_learner_access_status(uuid, text) to authenticated;
