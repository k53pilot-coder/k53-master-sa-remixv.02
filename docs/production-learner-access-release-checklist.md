# K53 production learner-access release gate

This checklist is deliberately separate from the feature implementation. It does not apply the migration, change Supabase Auth settings, merge the PR, or deploy the Worker.

## Production facts checked read-only on 2026-11-21

- Supabase project: `qfolceulguweezxjvvjt`, PostgreSQL 17.11, Free plan.
- Existing production data: 3 Auth users, 3 profiles, 0 question attempts, 0 test attempts.
- All 3 current Auth users are confirmed and Google-linked: 1 owner account and 2 non-owner accounts.
- `learner_access` and its four RPCs do not exist yet.
- Existing learner tables have RLS enabled and owner-scoped policies. Their authenticated table grants include privileges not required by the app; the feature migration narrows these.
- Production `postgres` has `BYPASSRLS`, usage on `auth`, and SELECT on all current Auth tables and the app's learner tables. This makes it the appropriate account to attempt a complete logical export.
- `storage.objects` and PostgreSQL large objects currently contain 0 rows.
- The existing Auth user trigger calls `public.create_learner_profile()`, a SECURITY DEFINER function owned by postgres with an empty search_path. The feature migration does not replace or modify that trigger.
- Cloudflare's Worker Build integration watches GitHub `main`, has automatic builds enabled, and uses the root `packageManager` pin (`bun@1.4.5`), and deploys with `bun run build` followed by `npx wrangler deploy`. Merging this PR to `main` therefore triggers production deployment.

## Gate 1 — complete production database backup

The Supabase Free plan does not include automatic daily backups. Do not use `supabase db dump` as the sole rollback backup: the CLI deliberately excludes managed schemas such as `auth` and `storage`.

1. In Supabase Dashboard, open project **Connect** and copy the **Session pooler** connection string. Use the `postgres.<project-ref>` database user and remove the password from the URL so the CLI can prompt for it. Do not paste the password into chat, Git, or a command saved in shell history.
2. Install/use PostgreSQL client tools version 17.11 or later.
3. From a private local directory with adequate free disk space, run:

```sh
pg_dump --version
pg_dump --format=custom --password --file=k53-production-before-learner-access.dump --dbname='postgresql://postgres.qfolceulguweezxjvvjt@<SESSION-POOLER-HOST>:5432/postgres'
```

Replace only `<SESSION-POOLER-HOST>` with the host shown in the Dashboard connection string. The command prompts for the database password. It intentionally does not exclude managed schemas, and it retains database ACLs.

4. Verify the archive can be listed and fully read without restoring it:

```sh
pg_restore --list k53-production-before-learner-access.dump
pg_restore --file=/dev/null k53-production-before-learner-access.dump
```

5. Confirm the archive listing contains table definitions/data for `auth.users`, `auth.identities`, `public.profiles`, `public.question_attempts`, and `public.test_attempts`. Confirm the dump command exited successfully and the file is non-empty. Keep the archive encrypted and outside the repository. Never upload the archive here; it contains personal and authentication data.

If `pg_dump` reports permission errors or the archive does not contain the required Auth identity and app tables, stop. Do not accept a partial backup. Resolve the backup method first. The current read-only permission checks indicate that the production `postgres` role has BYPASSRLS and SELECT on the Auth tables, but the actual export still must be run and verified locally.

## Gate 2 — existing account access decision

The migration creates an empty allowlist. It does not automatically authorise existing users. As checked on 2026-11-21, production has two existing non-owner, confirmed Google-linked accounts. The owner account is separate and remains admin-only unless explicitly added as a learner.

Before the migration, explicitly decide whether to grandfather both existing non-owner accounts into active learner access, or only selected accounts. Do not automatically authorise every current account. The approved emails must be confirmed by the owner and inserted as active allowlist records before the new Worker is deployed; otherwise existing users will be blocked from learning when the new Worker goes live.

## Gate 3 — apply migration, then deploy

The order is mandatory:

1. Verify the full backup and account authorisation decision.
2. Apply `supabase/migrations/20261119170000_learner_email_access.sql` to production exactly once, using a reviewed production connection.
3. Verify the new table, all four RPCs, RLS policies, table/function/schema grants, and the existing profile trigger.
4. Add only the explicitly approved existing learner email records and verify their links/statuses. Do not link the owner account unless separately approved as a learner.
5. Re-check existing user/profile counts and confirm no existing records were modified or deleted.
6. Only then merge PR #19. Cloudflare automatically builds/deploys the Worker from `main`; there is no separate manual deploy gate in this account's current configuration.
7. Verify public routes, admin-only access, approved learners, unapproved learners, disabled learners, and restored learners against production using designated test accounts. Do not use or alter real learner accounts as test fixtures.

If any pre-deployment step fails, do not merge. A Worker rollback must not drop the allowlist or erase its account bindings. Database rollback must preserve learner records and audit history.

## Separate Supabase Auth hardening

The Supabase Security Advisor currently reports leaked-password protection disabled. This is independent of the learner-access migration. Decide whether to enable it separately in Supabase Auth settings and test the resulting sign-in/password policy. Do not bundle this setting change into the database migration.

## Approval boundary

No production migration, database write, Auth setting change, Cloudflare production configuration change, PR merge, or production Worker deployment has been performed as part of this preparation.
