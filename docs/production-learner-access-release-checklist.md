# K53 production learner-access release gate

This checklist prepares the owner-controlled learner approval workflow. It does not apply the migration, change Supabase Auth settings, merge the PR, or deploy the Worker.

## Production facts checked read-only on 2026-11-21

- Supabase project: `qfolceulguweezxjvvjt`, PostgreSQL 17.11, Free plan.
- Existing production data: 3 Auth users, 3 profiles, 0 question attempts, 0 test attempts.
- All 3 current Auth users are confirmed and Google-linked: 1 owner account and 2 non-owner accounts.
- `learner_access` and its four RPCs do not exist yet.
- Existing learner tables have RLS enabled and owner-scoped policies. Their authenticated table grants include privileges not required by the app; the feature migration narrows these.
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

## Gate 1 — complete production database backup

The Supabase Free plan does not include automatic daily backups. Do not use `supabase db dump` as the sole rollback backup: the CLI deliberately excludes managed schemas such as `auth` and `storage`.

1. In Supabase Dashboard, open project **Connect** and copy the **Session pooler** connection string. Use the `postgres.<project-ref>` database user and remove the password from the URL so the CLI can prompt for it. Do not paste the password into chat, Git, or a command saved in shell history.
2. Install/use PostgreSQL client tools version 17.11 or later.
3. From a private local directory with adequate free disk space, run:

```sh
pg_dump --version
pg_dump --format=custom --password --file=k53-production-before-learner-access.dump --dbname='postgresql://postgres.qfolceulguweezxjvvjt@<SESSION-POOLER-HOST>:5432/postgres'
```

Replace only `<SESSION-POOLER-HOST>` with the host shown in the Dashboard connection string. The command prompts for the database password.

4. Verify the archive can be listed and fully read without restoring it:

```sh
pg_restore --list k53-production-before-learner-access.dump
pg_restore --file=/dev/null k53-production-before-learner-access.dump
```

5. Confirm the archive listing contains table definitions/data for `auth.users`, `auth.identities`, `public.profiles`, `public.question_attempts`, and `public.test_attempts`. Confirm the dump command exited successfully and the file is non-empty. Keep the archive encrypted and outside the repository. Never upload the archive; it contains personal and authentication data.

If export permissions fail or required Auth/app tables are absent, stop. Do not accept a partial backup.

## Gate 2 — apply migration

1. Verify the complete backup.
2. **Do not use `supabase db push --remote` for this release yet.** Production migration history contains five applied versions (`20261115134248`, `20261115134504`, `20261117090406`, `20261117090432`, `20261117090509`) whose migration files are absent from this repository. A normal CLI push can fail on this remote/local history mismatch. Do not create placeholder migrations or run `migration repair` blindly.
3. Only after explicit production approval, apply the reviewed learner-access SQL once through the Supabase migration application tool. Capture the version it returns and make the committed migration filename match that version in a follow-up branch commit. Alternatively, reconcile the existing baseline/history as a separate reviewed task before using `db push`.
4. Verify the new table, all four RPCs, RLS policies, table/function/schema grants, and the existing profile trigger.
5. Confirm the allowlist is empty and no existing Auth/profile records were modified or deleted.

## Gate 3 — publish and owner approval

1. Confirm the migration and verification passed.
2. Run the final branch CI and built-Worker browser smoke tests against the exact PR head.
3. Merge PR #19 only after explicit approval. Cloudflare automatically builds/deploys the Worker from `main`; merging triggers production deployment.
4. Verify the owner can sign in and reach the admin interface, while an unapproved Google account cannot access learning.
5. Have the owner add the intended learner email addresses through the admin interface. Verify each approved learner can access learning.
6. Verify an unapproved account remains denied, a disabled learner is denied (including an existing session), and restoring access works after refresh.
7. Do not use or alter real learner accounts as test fixtures. Use designated test accounts.
8. Confirm existing profile and attempt row counts remain intact.

If any pre-deployment step fails, do not merge. A Worker rollback must not drop the allowlist or erase its account bindings. Database rollback must preserve learner records and audit history.

## Separate Supabase Auth hardening

The Supabase Security Advisor reports leaked-password protection disabled. This is independent of the learner-access migration. Decide whether to enable it separately in Supabase Auth settings and test the resulting sign-in/password policy. Do not bundle this setting change into the database migration.

## Approval boundary

No production migration, database write, Auth setting change, Cloudflare production configuration change, PR merge, or production Worker deployment has been performed as part of this preparation.