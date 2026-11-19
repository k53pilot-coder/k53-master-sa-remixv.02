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
