# K53 build

- [x] Build eight-category learning dashboard, lessons and road-sign library.
- [x] Build practice, retry pile and section-scored mock tests.
- [x] Add learner profiles, sign-in and batched progress sync.
- [x] Add a server-guarded admin workspace shell; management actions remain disabled until backend storage and policies are configured.
- [x] Restrict the admin portal to OTP-verified owner/admin emails and allow admins to grant trusted admin roles.
- [x] Create a standalone Supabase project for K53 Master SA and add learner tables, indexes, profile creation trigger, and owner-scoped RLS policies.
- [ ] Connect the Cloudflare deployment to that project: set build-time `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, plus Worker runtime `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only; it is required for admin grants, not sign-in.
- [ ] Configure the Supabase email OTP template to send `{{ .Token }}`, confirm the owner account exists, and allow the deployed app's auth redirect URLs.
- [x] Merge guest study progress into the first signed-in account on this device.
- [x] Add practical/DLTC guides and supplied references.
- [x] Add guarded installable offline support with a fallback for uncached pages.
- [x] Preview the production Cloudflare Worker locally with Wrangler; all app routes return successfully.
- [x] Run the local test suite; 33 tests passed. Signed-in sync still needs verification against the deployed Supabase project.
- [ ] Verify signed-in sync and profile creation — needs the first confirmed learner account.
- [ ] Verify published offline restart — needs publication; preview deliberately disables offline caching.
- [ ] Reconcile every catalogue variant and explanation against sources — authoritative catalogue/chart files and the audit report are not in this repository; no completeness claim.
- [ ] Measure 500 simultaneous users — needs a published target and controlled load-test window.
- [x] Remix: restore learner database access and profile creation on the new database.
- [x] Show official sign artwork in questions; hide answer-revealing control tables; add picture checks.
- [x] Check practice, signs and About at 360–1366 widths (no sideways scrolling).
- [x] Add About & Legal page linked from the menu and footer.
- [x] Sign chart audit spreadsheet in Files.
- [ ] Verify and add missing master signs — source PDFs are Lovable-managed assets, but the prior 58-candidate audit list/report is not in this repository; do not infer codes or artwork.
- [ ] Fill About & Legal publisher contact placeholders (verified support email and CIPC number) — needs publisher-provided details.

 
## Engineering remediation status (2026-11-17)

### Implemented in source
- [x] Added a Drizzle schema representation for profiles, question attempts and test attempts.
- [x] Added a versioned SQL migration that creates missing learner tables, indexes, owner-scoped RLS policies, grants, and the learner-profile trigger.
- [x] Added a question-bank audit script. Run `npm run audit:questions`; it reports invalid IDs/answers/categories and missing explanations without inventing educational content.
- [x] Added a `typecheck` script and a GitHub Actions workflow for typecheck, tests, lint, build and question-bank audit.
- [x] Registered the new migration in the Drizzle migration journal.

### Still requires live project access or publisher decisions
- [ ] Apply migrations to the standalone Supabase project after taking a database backup. Inspect `pg_policies` and remove any older permissive policies; PostgreSQL permissive policies combine with OR.
- [ ] Confirm actual live schema matches the checked-in schema, including constraints, grants, indexes and triggers.
- [ ] Configure Cloudflare build variables and Worker secrets; never put the service-role key in Git or `VITE_*` variables.
- [ ] Configure Supabase OTP email template, owner account, production redirect allow-list, and test sign-up, sign-in, recovery and admin OTP end-to-end.
- [ ] Verify sync using two real accounts and two devices, including offline/reconnect, account switching, duplicate retries and cross-account isolation.
- [ ] Add a protected admin audit log and an owner-only role revocation workflow; validate operational recovery before enabling either.
- [ ] Implement and test account/data deletion, including Supabase rows, auth identity, and locally cached data. Confirm retention/legal requirements first.
- [ ] Replace publisher contact placeholders with verified support email and CIPC details.
- [ ] Reconcile all questions and sign artwork against authoritative South African source material. Do not auto-write explanations or add sign codes without the source documents.
- [ ] Verify PWA install/offline restart on the published origin.
- [ ] Run a controlled 500-concurrent-user load test against the deployed environment and record latency/error thresholds.
- [ ] Verify GitHub Actions results after the first workflow run; the workflow has been added but has not yet been executed in this session.

**Migration safety note:** the migration is additive and idempotent for absent tables and named policies. It does not drop unknown existing policies or reconcile unknown live column definitions. Back up the database and inspect its current catalog before applying it.
