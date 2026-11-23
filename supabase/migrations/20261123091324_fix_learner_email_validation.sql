-- Correct the email-domain separator in the learner approval RPC.
-- The prior SQL literal contained an over-escaped backslash, so PostgreSQL's
-- regular-expression engine treated the domain separator incorrectly.
-- A bracket expression makes the literal dot unambiguous.

create or replace function public.admin_add_learner_access(p_email text)
returns table(record_id uuid, result_status text)
language plpgsql
security definer
set search_path to ''
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
     or v_email !~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9-]+([.][A-Za-z0-9-]+)+$' then
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
