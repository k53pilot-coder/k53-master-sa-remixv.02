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

-- First-time linking is atomic and can only be requested by trusted server code
-- using the service-role key. The email and UUID are supplied only after the
-- server has verified the Supabase Auth user with getUser(accessToken).
create or replace function public.claim_learner_access(
  p_user_id uuid,
  p_email text
)
returns table (access_status text)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_access public.learner_access%rowtype;
begin
  if p_user_id is null or p_email is null or pg_catalog.btrim(p_email) = '' then
    return query select 'pending'::text;
    return;
  end if;

  -- An existing UUID binding takes precedence over email. A later email
  -- change must not silently transfer or discard the original authorisation.
  select *
    into v_access
    from public.learner_access
    where user_id = p_user_id
    for update;

  if found then
    return query
      select case when v_access.status = 'active' then 'active' else 'disabled' end;
    return;
  end if;

  select *
    into v_access
    from public.learner_access
    where email = pg_catalog.lower(pg_catalog.btrim(p_email))
    for update;

  if not found or v_access.status <> 'active' or v_access.user_id is not null then
    return query select
      case when found and v_access.status = 'disabled' then 'disabled' else 'pending' end;
    return;
  end if;

  begin
    update public.learner_access
       set user_id = p_user_id,
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
      -- Another email record is already linked to this Auth account.
      return query select 'pending'::text;
      return;
  end;
end;
$function$;

revoke all on function public.claim_learner_access(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_learner_access(uuid, text) to service_role;

-- RLS policies are permissive by default and combine with OR. Replace the
-- existing owner policies with owner AND active-authorisation predicates so
-- adding another permissive policy cannot accidentally reopen access.
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

-- RLS does not protect TRUNCATE. Remove the excess table privileges observed
-- in the existing production grants while preserving legitimate operations.
revoke delete, truncate on table public.profiles,
  public.question_attempts, public.test_attempts
  from anon, authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert on table public.question_attempts to authenticated;
grant select, insert on table public.test_attempts to authenticated;


-- Administrative operations are deliberately RPC-only. They are callable by
-- service_role from server functions, never by anon/authenticated clients.
create or replace function public.admin_add_learner_access(
  p_email text,
  p_actor uuid
)
returns table (record_id uuid, result_status text)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_email text := pg_catalog.lower(pg_catalog.btrim(p_email));
  v_id uuid;
  v_status text;
begin
  if v_email = '' or pg_catalog.length(v_email) > 254
     or v_email !~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$' then
    raise exception 'Invalid email address' using errcode = '22023';
  end if;

  insert into public.learner_access(email, status, created_by, updated_by)
  values (v_email, 'active', p_actor, p_actor)
  on conflict (email) do nothing
  returning id into v_id;

  if v_id is not null then
    return query select v_id, 'created'::text;
    return;
  end if;

  -- A concurrent request may have inserted the email first. Read the
  -- committed record and return its current status instead of failing.
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
language sql
security definer
set search_path = ''
stable
as $function$
  select la.id, la.email, la.user_id, la.status, la.created_at, la.updated_at
  from public.learner_access la
  where p_search is null
     or p_search = ''
     or la.email like '%' || pg_catalog.lower(pg_catalog.btrim(p_search)) || '%'
  order by la.created_at desc
  limit 500;
$function$;

create or replace function public.admin_set_learner_access_status(
  p_id uuid,
  p_status text,
  p_actor uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if p_status not in ('active', 'disabled') then
    raise exception 'Invalid learner access status' using errcode = '22023';
  end if;

  update public.learner_access
     set status = p_status,
         updated_by = p_actor,
         updated_at = pg_catalog.now()
   where id = p_id;

  return found;
end;
$function$;

revoke all on function public.admin_add_learner_access(text, uuid) from public, anon, authenticated;
revoke all on function public.admin_list_learner_access(text) from public, anon, authenticated;
revoke all on function public.admin_set_learner_access_status(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.admin_add_learner_access(text, uuid) to service_role;
grant execute on function public.admin_list_learner_access(text) to service_role;
grant execute on function public.admin_set_learner_access_status(uuid, text, uuid) to service_role;
