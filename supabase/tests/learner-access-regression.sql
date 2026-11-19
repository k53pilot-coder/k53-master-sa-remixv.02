-- Run after learner_email_access migration in disposable CI Postgres.
\set ON_ERROR_STOP on

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

-- Anonymous visitors have no direct access to learner authorisations.
set role anon;
do $$
begin
  begin
    perform count(*) from public.learner_access;
    raise exception 'anonymous role unexpectedly read learner authorisations';
  exception when insufficient_privilege then
    null;
  end;
end $$;
reset role;

-- RLS does not protect TRUNCATE. Check that broad legacy table privileges were
-- removed and that privileged admin RPCs are not callable by client roles.
do $$
begin
  if has_table_privilege('authenticated','public.profiles','DELETE')
     or has_table_privilege('authenticated','public.profiles','TRUNCATE')
     or has_table_privilege('authenticated','public.question_attempts','DELETE')
     or has_table_privilege('authenticated','public.question_attempts','TRUNCATE')
     or has_table_privilege('authenticated','public.test_attempts','DELETE')
     or has_table_privilege('authenticated','public.test_attempts','TRUNCATE') then
    raise exception 'authenticated role retains DELETE or TRUNCATE privilege';
  end if;
  if has_table_privilege('anon','public.profiles','DELETE')
     or has_table_privilege('anon','public.profiles','TRUNCATE')
     or has_table_privilege('anon','public.question_attempts','DELETE')
     or has_table_privilege('anon','public.question_attempts','TRUNCATE')
     or has_table_privilege('anon','public.test_attempts','DELETE')
     or has_table_privilege('anon','public.test_attempts','TRUNCATE') then
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

-- A second UUID cannot claim an already-linked email.
set role authenticated;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","email":"other@example.com","app_metadata":{"provider":"google","providers":["google"]}}',false);
select * from public.claim_learner_access();
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
