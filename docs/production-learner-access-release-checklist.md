# K53 production learner-access release record

Updated 2026-11-23 after production migration and release verification. The production backup requirement was explicitly waived by the owner; no backup was created. The release is being prepared for publication.

## Production state verified on 2026-11-23

- Supabase project: `qfolceulguweezxjvvjt`, PostgreSQL 17.11, Free plan.
- Existing production data: 3 Auth users, 3 profiles, 0 question attempts, 0 test attempts.
- All 3 current Auth users are confirmed and Google-linked: 1 owner account and 2 non-owner accounts.
- Production migration `20261123083317_learner_email_access` has been applied successfully. `public.learner_access` and all four RPCs exist. The allowlist contains zero rows.
- Existing learner tables have RLS enabled. The migration replaced the known permissive owner policies with owner-scoped policies and added restrictive active-learner guards. It reduced authenticated grants to profiles SELECT/INSERT/UPDATE, question_attempts SELECT/INSERT, test_attempts SELECT/INSERT, and learner_access SELECT only; anon has no direct grants on these tables.
- Production `postgres` has `BYPASSRLS`, usage on `auth`, and SELECT on all current Auth tables and the app's learner tables.
- `storage.objects` and PostgreSQL large objects currently contain 0 rows.
- The existing Auth user trigger calls `public.create_learner_profile()`; the feature migration does not replace or modify that trigger.
- Cloudflare's Worker Build integration watches GitHub `main`, has automatic builds enabled, and deploys with `bun run build` followed by `npx wrangler deploy`. Merging this PR to `main` triggers production deployment.

## Access policy

- The owner is the sole authority who approves learners through the application's admin interface.
- The owner signs in with Google and uses the admin interface to add a learner's email address, then can disable or restore that learner.
- Google sign-in alone never grants learner access. An account must have an active owner-approved email record bound to its Auth UUID.
- Existing non-owner accounts are not automatically grandfathered. They remain blocked from learning until the owner approves them.
- The owner account is administrative by default and is not automatically a learner. Do not add it to learner access unless the owner separately chooses to do so.
- No initial learner email list or pre-deployment seed is required. The allowlist starts empty; the owner approves learners after the migration is installed and the application is deployed.

## Backup decision

The owner explicitly waived the backup requirement on 2026-11-23. No production backup was created or verified. Supabase Free has no downloadable managed daily backup, and the attempted direct connection from the owner's IPv4-only network could not reach the database's IPv6 direct endpoint. This release therefore proceeds with reduced recovery protection.

## Production migration — completed

- The reviewed migration was applied once through the Supabase migration tool; no `db push` was used.
- Returned production migration version: `20261123083317`.
- The committed migration file and its CI/local-test references have been renamed to `supabase/migrations/20261123083317_learner_email_access.sql` to match production.
- The five pre-existing migration versions remain unchanged.
- Post-migration row counts: `auth.users` 3, `auth.identities` 4, `public.profiles` 3, `public.question_attempts` 0, `public.test_attempts` 0, `public.learner_access` 0.
- The existing `auth.users` trigger `create_learner_profile` is preserved.
- Production contains `claim_learner_access`, `admin_add_learner_access`, `admin_list_learner_access`, and `admin_set_learner_access_status`.
- RLS policies, table grants, private schema access and helper function access were checked. The allowlist remains empty.
- Transactional smoke checks: owner JWT may call admin listing and receives learner status `pending`; ordinary Google account is denied admin RPC access and receives learner status `pending`. These test transactions were rolled back.
- The security advisor additionally reports four SECURITY DEFINER RPC warnings. These functions require authenticated execution for the app; their bodies check identity/status, and the ordinary-account denial was tested. Leaked-password protection remains a separate Auth warning.

## Publication sequence

1. Confirm CI and built-Worker browser smoke succeed on the exact updated PR head after the migration filename alignment.
2. Mark PR #19 ready for review and merge it to `main`. Cloudflare's automatic Worker build/deploy from `main` will publish the app.
3. Verify production owner admin access and denied-by-default learner access.
4. The owner approves learner emails individually through the admin interface. The allowlist starts empty; existing Google-linked non-owner accounts are not grandfathered.
5. Verify approved, unapproved, disabled and restored learner scenarios.

Do not use `supabase db push --remote` until the five historical migrations absent from the original repo have been reconciled.

## Separate Supabase Auth hardening

The Supabase Security Advisor reports leaked-password protection disabled. This is independent of the learner-access migration. Decide whether to enable it separately in Supabase Auth settings and test the resulting sign-in/password policy. Do not bundle this setting change into the database migration.

## Approval boundary

No production migration, database write, Auth setting change, Cloudflare production configuration change, PR merge, or production Worker deployment has been performed as part of this preparation.