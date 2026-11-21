-- Run after learner_email_access migration in disposable CI Postgres.
\set ON_ERROR_STOP on

-- Confirm the migration replaced the actual production policy names and
-- installed restrictive guards on all learner-owned tables.
do $assert$
declare
  old_policy_count integer;
  guard_count integer;
begin
  select count(*) into old_policy_count
  from pg_catalog.pg_policies
  where schemaname = 'public'
    and tablename in ('profiles','question_attempts','test_attempts')
    and policyname in (
      'profiles_select_own','profiles_insert_own','profiles_update_own',
      'question_attempts_select_own','question_attempts_insert_own',
      'test_attempts_select_own','test_attempts_insert_own'
    );

  if old_policy_count <> 0 then
    raise exception 'legacy production RLS policies remain after migration';
  end if;

  select count(*) into guard_count
  from pg_catalog.pg_policies
  where schemaname = 'public'
    and tablename in ('profiles','question_attempts','test_attempts')
    and policyname in (
      'profiles_learner_access_guard',
      'question_attempts_learner_access_guard',
      'test_attempts_learner_access_guard'
    )
    and permissive = 'RESTRICTIVE';

  if guard_count <> 3 then
    raise exception 'expected three restrictive learner-access guards, found %', guard_count;
  end if;
end $assert$;

-- The migration owns a dedicated, non-exposed helper schema and does not
-- grant schema usage or helper execution to client roles.
do $service_role_grants$
begin
  if has_table_privilege('service_role','public.learner_access','DELETE')
     or has_table_privilege('service_role','public.learner_access','TRUNCATE')
     or has_table_privilege('service_role','public.learner_access','REFERENCES')
     or has_table_privilege('service_role','public.learner_access','TRIGGER')
     or has_table_privilege('service_role','public.learner_access','MAINTAIN') then
    raise exception 'service_role retains privileges beyond learner-access maintenance requirements';
  end if;
  if not has_table_privilege('service_role','public.learner_access','SELECT')
     or not has_table_privilege('service_role','public.learner_access','INSERT')
     or not has_table_privilege('service_role','public.learner_access','UPDATE') then
    raise exception 'service_role is missing required learner-access maintenance privileges';
  end if;
end
$service_role_grants$;

do $schema_guard$
begin
  if has_schema_privilege('anon','k53_learner_access_private','USAGE')
     or has_schema_privilege('authenticated','k53_learner_access_private','USAGE') then
    raise exception 'client roles unexpectedly have access to k53_learner_access_private';
  end if;
  if has_function_privilege('anon','k53_learner_access_private.is_current_user_k53_admin()','EXECUTE')
     or has_function_privilege('authenticated','k53_learner_access_private.is_current_user_k53_admin()','EXECUTE') then
    raise exception 'client roles can directly execute the private admin helper';
  end if;
end
$schema_guard$;

-- A verified fixed owner can manage learner authorisations using its JWT.
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","email":"aiamplifysa@gmail.com","app_metadata":{"provider":"email","providers":["email"]}}',false);
select * from public.admin_add_learner_access(' Learner@Example.com ');
reset role;

-- A separately assigned Google administrator can manage learner access.
set role authenticated;
select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',false);
select set_config('request.jwt.claims','{"sub":"44444444-4444-4444-8444-444444444444","email":"admin@example.com","app_metadata":{"provider":"google","providers":["google"],"roles":["admin"]}}',false);
select * from public.admin_add_learner_access('admin-managed@example.com');
select * from public.admin_list_learner_access('admin-managed@example.com');
reset role;

-- The owner is an administrator, not automatically a learner. Even with a
-- linked Google identity, the owner needs a separate learner allowlist row.
update auth.users
   set raw_app_meta_data = '{"provider":"email","providers":["email","google"]}'
 where id = '11111111-1111-4111-8111-111111111111';
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","email":"aiamplifysa@gmail.com","app_metadata":{"provider":"email","providers":["email","google"]}}',false);
do $owner_not_learner$
declare
  claim_status text;
begin
  select access_status into claim_status from public.claim_learner_access();
  if claim_status <> 'pending' then
    raise exception 'admin owner must not receive learner access automatically, got %', claim_status;
  end if;
end
$owner_not_learner$;
reset role;

-- A Google-linked account with an unverified email must fail closed.
set role authenticated;
select set_config('request.jwt.claim.sub','55555555-5555-4555-8555-555555555555',false);
select set_config('request.jwt.claims','{"sub":"55555555-5555-4555-8555-555555555555","email":"unverified@example.com","app_metadata":{"provider":"google","providers":["google"]}}',false);
do $unverified_email$
declare
  claim_status text;
begin
  select access_status into claim_status from public.claim_learner_access();
  if claim_status <> 'unverified' then
    raise exception 'unverified email should not claim learner access, got %', claim_status;
  end if;
end
$unverified_email$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","email":"learner@example.com","app_metadata":{"provider":"google","providers":["google"]}}',false);
select * from public.claim_learner_access();
reset role;

-- Active learner can read and write only their own profile and progress.
set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","email":"learner@example.com","app_metadata":{"provider":"google","providers":["google"]}}',false);
do $$
begin
  if (select count(*) from public.learner_access) <> 1 then
    raise exception 'learner should see exactly their own access record';
  end if;

  insert into public.profiles(id,display_name)
    values ('22222222-2222-4222-8222-222222222222','Learner');
  insert into public.question_attempts(id,user_id,question_id,category,correct)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            '22222222-2222-4222-8222-222222222222','q-1',1,true);
  insert into public.test_attempts(id,user_id,mode,results)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            '22222222-2222-4222-8222-222222222222','mock','{"score": 42}');

  if (select count(*) from public.profiles) <> 1 then
    raise exception 'active learner should read own profile';
  end if;
  if (select count(*) from public.question_attempts) <> 1 then
    raise exception 'active learner should read own question attempts';
  end if;
  if (select count(*) from public.test_attempts) <> 1 then
    raise exception 'active learner should read own test attempts';
  end if;
end $$;
reset role;

-- A different account cannot see any of the first learner's private records.
set role authenticated;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","email":"other@example.com","app_metadata":{"provider":"google","providers":["google"]},"user_metadata":{"role":"owner","roles":["admin","owner"]}}',false);

do $$
begin
  begin
    perform * from public.admin_list_learner_access('');
    raise exception 'user_metadata role spoof unexpectedly granted admin access';
  exception when insufficient_privilege then
    null;
  end;
end $$;
do $$
begin
  if (select count(*) from public.learner_access) <> 0 then
    raise exception 'other account can see learner access record';
  end if;
  if (select count(*) from public.profiles) <> 0 then
    raise exception 'other account can see learner profile';
  end if;
  if (select count(*) from public.question_attempts) <> 0 then
    raise exception 'other account can see question attempts';
  end if;
  if (select count(*) from public.test_attempts) <> 0 then
    raise exception 'other account can see test attempts';
  end if;
end $$;
reset role;

-- Disable the linked learner; profile and progress reads/writes must stop.
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","email":"aiamplifysa@gmail.com","app_metadata":{"provider":"google","providers":["google"],"roles":["owner"]}}',false);
select public.admin_set_learner_access_status(
  (select id from public.admin_list_learner_access('learner@example.com')),
  'disabled'
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","email":"learner@example.com","app_metadata":{"provider":"google","providers":["google"]}}',false);
do $$
begin
  if (select count(*) from public.profiles) <> 0 then
    raise exception 'disabled learner can still read profile';
  end if;
  if (select count(*) from public.question_attempts) <> 0 then
    raise exception 'disabled learner can still read question attempts';
  end if;
  if (select count(*) from public.test_attempts) <> 0 then
    raise exception 'disabled learner can still read test attempts';
  end if;

  begin
    insert into public.profiles(id,display_name)
      values ('22222222-2222-4222-8222-222222222222','Should fail');
    raise exception 'disabled learner profile insert unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
  begin
    insert into public.question_attempts(id,user_id,question_id,category,correct)
      values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc',
              '22222222-2222-4222-8222-222222222222','q-2',1,false);
    raise exception 'disabled learner question-attempt insert unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
  begin
    insert into public.test_attempts(id,user_id,mode,results)
      values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd',
              '22222222-2222-4222-8222-222222222222','mock','{"score": 10}');
    raise exception 'disabled learner test-attempt insert unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
end $$;
reset role;

-- Authenticated users cannot mutate learner authorisations.
set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$
begin
  begin
    insert into public.learner_access(email) values ('attacker@example.com');
    raise exception 'authenticated user unexpectedly inserted an allowlist row';
  exception when insufficient_privilege then
    null;
  end;
  if has_table_privilege('authenticated','public.learner_access','UPDATE')
     or has_table_privilege('authenticated','public.learner_access','DELETE') then
    raise exception 'authenticated user has learner-access mutation privileges';
  end if;
end $$;
reset role;

-- Assert the complete table privilege matrix, including privileges not
-- covered by RLS. Anonymous users get no table grants; authenticated users
-- get SELECT only on the allowlist and no UPDATE on append-only progress.
do $exact_grants$
begin
  if has_table_privilege('anon','public.learner_access','SELECT')
     or has_table_privilege('anon','public.learner_access','INSERT')
     or has_table_privilege('anon','public.learner_access','UPDATE')
     or has_table_privilege('anon','public.profiles','SELECT')
     or has_table_privilege('anon','public.profiles','INSERT')
     or has_table_privilege('anon','public.profiles','UPDATE')
     or has_table_privilege('anon','public.question_attempts','SELECT')
     or has_table_privilege('anon','public.question_attempts','INSERT')
     or has_table_privilege('anon','public.question_attempts','UPDATE')
     or has_table_privilege('anon','public.test_attempts','SELECT')
     or has_table_privilege('anon','public.test_attempts','INSERT')
     or has_table_privilege('anon','public.test_attempts','UPDATE') then
    raise exception 'anon retains a learner table privilege';
  end if;
  if has_table_privilege('authenticated','public.learner_access','INSERT')
     or has_table_privilege('authenticated','public.learner_access','UPDATE')
     or has_table_privilege('authenticated','public.learner_access','DELETE')
     or has_table_privilege('authenticated','public.learner_access','TRUNCATE')
     or has_table_privilege('authenticated','public.learner_access','REFERENCES')
     or has_table_privilege('authenticated','public.learner_access','TRIGGER')
     or has_table_privilege('authenticated','public.learner_access','MAINTAIN') then
    raise exception 'authenticated has learner_access mutation or excess privileges';
  end if;
  if has_table_privilege('authenticated','public.question_attempts','UPDATE')
     or has_table_privilege('authenticated','public.test_attempts','UPDATE') then
    raise exception 'authenticated has unnecessary UPDATE on append-only progress tables';
  end if;
end
$exact_grants$;

-- Anonymous visitors have no direct access to learner authorisations.
set role anon;
do $anon_access$
begin
  begin
    perform count(*) from public.learner_access;
    raise exception 'anonymous role unexpectedly read learner authorisations';
  exception when insufficient_privilege then
    null;
  end;
end $anon_access$;
reset role;

-- RLS does not protect TRUNCATE. Check that broad legacy table privileges were
-- removed and that privileged admin RPCs are not callable by client roles.
do $$
begin
  if has_table_privilege('authenticated','public.profiles','DELETE')
     or has_table_privilege('authenticated','public.profiles','TRUNCATE')
     or has_table_privilege('authenticated','public.profiles','MAINTAIN')
     or has_table_privilege('authenticated','public.profiles','REFERENCES')
     or has_table_privilege('authenticated','public.profiles','TRIGGER')
     or has_table_privilege('authenticated','public.question_attempts','DELETE')
     or has_table_privilege('authenticated','public.question_attempts','TRUNCATE')
     or has_table_privilege('authenticated','public.question_attempts','REFERENCES')
     or has_table_privilege('authenticated','public.question_attempts','TRIGGER')
     or has_table_privilege('authenticated','public.question_attempts','MAINTAIN')
     or has_table_privilege('authenticated','public.test_attempts','DELETE')
     or has_table_privilege('authenticated','public.test_attempts','TRUNCATE')
     or has_table_privilege('authenticated','public.test_attempts','REFERENCES')
     or has_table_privilege('authenticated','public.test_attempts','TRIGGER')
     or has_table_privilege('authenticated','public.test_attempts','MAINTAIN') then
    raise exception 'authenticated role retains privileges beyond the learner application requirements';
  end if;
  if not has_table_privilege('authenticated','public.profiles','SELECT')
     or not has_table_privilege('authenticated','public.profiles','INSERT')
     or not has_table_privilege('authenticated','public.profiles','UPDATE')
     or not has_table_privilege('authenticated','public.question_attempts','SELECT')
     or not has_table_privilege('authenticated','public.question_attempts','INSERT')
     or not has_table_privilege('authenticated','public.test_attempts','SELECT')
     or not has_table_privilege('authenticated','public.test_attempts','INSERT') then
    raise exception 'authenticated role is missing a required learner application privilege';
  end if;
  if has_table_privilege('anon','public.profiles','DELETE')
     or has_table_privilege('anon','public.profiles','TRUNCATE')
     or has_table_privilege('anon','public.profiles','MAINTAIN')
     or has_table_privilege('anon','public.profiles','REFERENCES')
     or has_table_privilege('anon','public.profiles','TRIGGER')
     or has_table_privilege('anon','public.question_attempts','DELETE')
     or has_table_privilege('anon','public.question_attempts','TRUNCATE')
     or has_table_privilege('anon','public.question_attempts','MAINTAIN')
     or has_table_privilege('anon','public.question_attempts','REFERENCES')
     or has_table_privilege('anon','public.question_attempts','TRIGGER')
     or has_table_privilege('anon','public.test_attempts','DELETE')
     or has_table_privilege('anon','public.test_attempts','TRUNCATE')
     or has_table_privilege('anon','public.test_attempts','MAINTAIN')
     or has_table_privilege('anon','public.test_attempts','REFERENCES')
     or has_table_privilege('anon','public.test_attempts','TRIGGER') then
    raise exception 'anon role retains DELETE or TRUNCATE privilege';
  end if;
  if has_function_privilege('anon','public.admin_add_learner_access(text)','EXECUTE')
     or has_function_privilege('anon','public.admin_list_learner_access(text)','EXECUTE')
     or has_function_privilege('anon','public.admin_set_learner_access_status(uuid,text)','EXECUTE') then
    raise exception 'anonymous role can execute learner admin RPC';
  end if;
  if not has_function_privilege('authenticated','public.admin_add_learner_access(text)','EXECUTE')
     or not has_function_privilege('authenticated','public.admin_list_learner_access(text)','EXECUTE')
     or not has_function_privilege('authenticated','public.admin_set_learner_access_status(uuid,text)','EXECUTE') then
    raise exception 'authenticated role lacks expected learner admin RPC execute grants';
  end if;
  if not has_function_privilege('authenticated','public.claim_learner_access()','EXECUTE') then
    raise exception 'authenticated role cannot execute its learner-access claim RPC';
  end if;
end $$;

-- Restore the original record so the takeover attempt is tested against
-- an active authorisation, not rejected merely because it is disabled.
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","email":"aiamplifysa@gmail.com","app_metadata":{"provider":"email","providers":["email"]}}',false);
select public.admin_set_learner_access_status(
  (select id from public.admin_list_learner_access('learner@example.com')),
  'active'
);
reset role;

-- A second UUID cannot take over an email already bound to another UUID.
-- Simulate the original learner changing their Auth email, then assign the
-- original allowlisted email to a different verified Google identity.
update auth.users
   set email = 'learner-renamed@example.com'
 where id = '22222222-2222-4222-8222-222222222222';
update auth.users
   set email = 'learner@example.com'
 where id = '33333333-3333-4333-8333-333333333333';

set role authenticated;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","email":"learner@example.com","app_metadata":{"provider":"google","providers":["google"]}}',false);
do $assert_takeover$
declare
  claim_status text;
  bound_user_id uuid;
begin
  select access_status into claim_status from public.claim_learner_access();
  if claim_status <> 'pending' then
    raise exception 'second UUID takeover should be pending, got %', claim_status;
  end if;
  select user_id into bound_user_id
    from public.learner_access
   where email = 'learner@example.com';
  if bound_user_id <> '22222222-2222-4222-8222-222222222222'::uuid then
    raise exception 'second UUID changed the original learner binding';
  end if;
end
$assert_takeover$;
-- Ordinary learner cannot invoke administrator RPCs, even though EXECUTE is granted.
do $$
begin
  begin
    perform * from public.admin_list_learner_access('');
    raise exception 'ordinary learner unexpectedly listed learner authorisations';
  exception when insufficient_privilege then
    null;
  end;
end $$;
reset role;

-- Restore leaves the immutable user binding intact. A different UUID still
-- cannot take the now-active email authorisation.
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","email":"aiamplifysa@gmail.com","app_metadata":{"provider":"google","providers":["google"],"roles":["owner"]}}',false);
select public.admin_set_learner_access_status(
  (select id from public.admin_list_learner_access('learner@example.com')),
  'active'
);
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
select * from public.claim_learner_access();
reset role;

-- A separately assigned Google admin can manage learner access using trusted
-- app_metadata. An ordinary user's user_metadata role claims do not grant it.
set role authenticated;
select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',false);
select set_config('request.jwt.claims','{"sub":"44444444-4444-4444-8444-444444444444","email":"admin@example.com","app_metadata":{"provider":"google","providers":["google"],"roles":["admin"]}}',false);
select * from public.admin_add_learner_access('admin-managed@example.com');
do $$
begin
  if (select count(*) from public.admin_list_learner_access('admin-managed@example.com')) <> 1 then
    raise exception 'Google admin could not list learner authorisation';
  end if;
end $$;
reset role;
