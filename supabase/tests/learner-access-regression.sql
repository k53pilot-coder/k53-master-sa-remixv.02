-- Run after learner_email_access migration in disposable CI Postgres.
\set ON_ERROR_STOP on

-- Authorise and link a verified learner.
set role service_role;
select * from public.admin_add_learner_access(' Learner@Example.com ', '11111111-1111-4111-8111-111111111111');
select * from public.claim_learner_access('22222222-2222-4222-8222-222222222222', 'learner@example.com');
reset role;

-- Authenticated learner sees only their own linked authorisation and can
-- access only their own profile/progress.
set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$$
begin
  if (select count(*) from public.learner_access) <> 1 then
    raise exception 'learner should see exactly their own access record';
  end if;
  insert into public.profiles(id,display_name) values ('22222222-2222-4222-8222-222222222222','Learner');
  if (select count(*) from public.profiles) <> 1 then
    raise exception 'active learner should read own profile';
  end if;
end $$;
reset role;

-- A different account cannot see the first learner's access or profile.
set role authenticated;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
do $$$
begin
  if (select count(*) from public.learner_access) <> 0 then
    raise exception 'other account can see learner access record';
  end if;
  if (select count(*) from public.profiles) <> 0 then
    raise exception 'other account can see learner profile';
  end if;
end $$;
reset role;

-- Disable the linked learner; profile and progress reads/writes must stop.
set role service_role;
select public.admin_set_learner_access_status(
  (select id from public.learner_access where email='learner@example.com'),
  'disabled',
  '11111111-1111-4111-8111-111111111111'
);
select * from public.claim_learner_access('22222222-2222-4222-8222-222222222222','learner@example.com');
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$$
begin
  if (select count(*) from public.profiles) <> 0 then
    raise exception 'disabled learner can still read profile';
  end if;
  begin
    insert into public.profiles(id,display_name) values ('22222222-2222-4222-8222-222222222222','Should fail');
    raise exception 'disabled learner insert unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
end $$;
reset role;


-- Authenticated users may inspect their own link but cannot mutate the allowlist.
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

-- A second UUID cannot claim an already-linked email.
set role service_role;
select * from public.claim_learner_access('33333333-3333-4333-8333-333333333333','learner@example.com');
reset role;

-- Restore leaves the immutable user binding intact. A different UUID still
-- cannot take the now-active email authorisation.
set role service_role;
select public.admin_set_learner_access_status(
  (select id from public.learner_access where email='learner@example.com'),
  'active',
  '11111111-1111-4111-8111-111111111111'
);
select * from public.claim_learner_access('33333333-3333-4333-8333-333333333333','learner@example.com');
select * from public.claim_learner_access('22222222-2222-4222-8222-222222222222','changed@example.com');
reset role;
