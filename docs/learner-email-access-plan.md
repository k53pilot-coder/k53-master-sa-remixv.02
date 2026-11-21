# Learner email authorisation — implementation plan

Status: implemented on feature/learner-email-access and verified against a disposable local Supabase stack. No production migration, Worker configuration, or deployment has been changed.

## Product rules

1. Every learning feature requires both a Supabase-authenticated identity and an active learner authorisation.
2. An owner or administrator is not automatically a learner. Admin-role policy and learner authorisation remain separate.
3. An administrator can pre-authorise an email before its owner registers.
4. A learner signs in using the existing Google OAuth flow. The server verifies the current Supabase Auth user and verified email; it never accepts an email supplied by the browser as proof.
5. First successful match links the active email authorisation to that Supabase user UUID. The link is one-to-one and is not silently moved to a different account.
6. Administrators can list/search, add, disable, and restore authorisations. V1 has no hard-delete, bulk import, email invitation, self-service access request, billing, subscription, or expiry workflow.
7. Public About and authentication routes remain accessible. /admin remains behind the existing requireAdmin flow and is exempt from the learner guard.
8. Learning routes include the dashboard, category learning, road signs, practice, mock test, review, practical resources, and DLTC learning resources. Progress/profile read and write endpoints are protected independently of the UI.

## Architecture and trust boundaries

### Identity and linking

- Continue using Supabase Google OAuth and the existing requireSupabaseAuth identity middleware.
- For a learner access check, resolve the current Auth user server-side with the bearer token (for example, Supabase auth.getUser(token)) and require a non-empty, verified email_confirmed_at. Do not treat user_metadata, a form field, or a locally cached user object as proof of email ownership.
- Normalise the verified email once on the server (trim and lowercase; enforce a maximum length and valid email format).
- Perform the first-link operation through the authenticated `public.claim_learner_access()` RPC. The function derives the caller UUID with `auth.uid()`, reads the verified email and trusted Google provider metadata from `auth.users`, and performs the link atomically. It must lock the matching allowlist row and permit only an unlinked row. A unique constraint on non-null user_id prevents one account from claiming multiple authorisations. If the email is already linked to a different UUID, fail closed.
- Once linked, enforce access by immutable Supabase user UUID, not by repeatedly matching email. This preserves the account binding if the user's email later changes.
- Do not silently reassign a consumed link. V1 recovery for a lost/deleted account is an administrator-controlled operational procedure, not a public self-service action.

### Database

Introduce a dedicated public.learner_access table with, at minimum:

- UUID primary key.
- Normalised unique email.
- Nullable linked Supabase user UUID (unique when non-null).
- Status constrained to active or disabled.
- Created/updated timestamps and actor UUID audit fields.
- Appropriate indexes for normalised email, linked user UUID, and status.

The exact foreign-key deletion behaviour for the linked user UUID must be selected deliberately during migration review. It must not silently make a consumed email authorisation claimable by a different Auth account after account deletion.

Table privileges and RLS:
- Revoke direct table writes and broad visibility from anon and authenticated; allow authenticated users SELECT only, with RLS restricting visibility to their own linked status row. Keep admin list/write operations behind admin-only RPCs.
- Admin add/list/search/disable/restore operations run in server functions behind existing `requireAdmin` and call SECURITY DEFINER RPCs that independently verify the signed caller's trusted admin identity. Do not expose direct table mutation privileges to browser clients.
- Add a restrictive active-learner condition to each existing learner-data table's RLS so it is ANDed with existing permissive owner policies. The current learner tables are profiles, question_attempts, and test_attempts. Verify policy composition in the development database before release.
- Revoke the known unnecessary DELETE and TRUNCATE privileges on the learner tables without removing required SELECT, INSERT, or profile UPDATE functionality. RLS does not protect against TRUNCATE.
- Explicitly revoke unintended table grants on the new table. Investigate default ACL ownership and role semantics before changing any schema-wide default privileges; do not apply a blanket default-privilege change.
- Important current-platform requirement: Supabase's October 30, 2026 rollout stopped automatically exposing newly created public tables through the Data API. The migration must explicitly grant the exact roles/privileges needed. For the proposed pattern, give authenticated users SELECT only (so RLS can show their own linked status row and the learner-data policies can test active status), give service_role only the SELECT/INSERT/UPDATE privileges required for trusted backend maintenance, and give anon no access. The current application calls the claim and admin RPCs with the authenticated user's JWT: grant claim execution to authenticated and admin RPC execution to authenticated, with each admin RPC enforcing trusted admin identity inside the database. Revoke default PUBLIC/anon execution. Verify PostgREST permissions on the disposable local stack before release. Do not copy broad legacy default ACLs onto the new table.

### Server functions

Create a learner access module separate from admin-role policy. It should provide:
- A read/check operation for the current signed-in user, including the authenticated atomic claim RPC and a safe result such as active, pending, disabled, unverified, or Google-required.
- An active learner middleware layered on authenticated identity, for learning data server functions.
- Admin-only add, list/search, disable, and restore operations with strict Zod validation, server-side normalisation, audit actor fields, and explicit duplicate handling.
- An authenticated transactional claim RPC that derives identity only from `auth.uid()` and `auth.users`. Do not implement first linking as an unprotected read followed by a separate update.
- Safe errors that do not disclose whether another user's email is authorised or linked to a different UUID.

Keep requireAdmin, getAdminRole, the owner email, and existing administrator role grants unchanged. Learner access must not be implemented by changing admin role claims.

### UI and route behaviour

- Add a distinct Learner access section to /admin; do not repurpose the existing Access section, which manages administrator roles.
- Admin table: email, first-sign-in/link state, active/disabled status, and explicit Disable/Restore actions. Add email before registration; search should be server-filtered.
- Adding an already-active email returns an “already authorised” outcome. Adding a disabled email does not reactivate it; the admin must use Restore.
- Require confirmation before disabling. Do not expose a permanent delete action.
- Update /auth copy and post-sign-in state for active, pending/unapproved, disabled, and verification failures.
- Put a central learner-route guard in the application shell or route layout for the learning routes, but keep server-function checks and RLS as the security boundary. Hide learning navigation while unauthorised; send pending/disabled users to an explanatory access state.
- Keep /about, /auth, and /admin out of the learner route guard. /admin continues to enforce its independent admin check.
- Gate direct profile writes and progress sync/load in addition to route rendering.

## Existing progress and offline data

The current StudyProvider supports guest IndexedDB progress, automatically merges guest data into a signed-in account, and syncs progress to Supabase. Forced authorisation changes that behaviour.

For this feature:
- Do not silently merge old guest/device progress into an account when the user signs in.
- Do not allow a pending or disabled user to sync or load cloud progress.
- Preserve existing account-owned progress for already-registered learners once their access is authorised.
- Keep existing local data untouched during the access migration; any guest-progress import must be a separate, explicit user-consented action.
- Learning routes are excluded from offline navigation caching and require an online access check. Offline study content is therefore unavailable while disconnected in V1; locally stored progress remains on the device and can sync after reconnection and successful authorisation. This limitation must be stated in release notes.
- The question bank is currently included in the client application bundle. UI and API gating controls normal app use but does not make bundled static question content confidential or prevent extraction. If content secrecy is a requirement, protected server-side content delivery is a separate phase.
- The PWA must not serve cached learning navigations without a current online access check. In V1, protected learning routes are live-only; offline learning is unavailable while disconnected, but local progress remains stored on-device. Every protected server operation and cloud-data read/write re-checks active status.

## Build and release sequence

### 0. Environment gates
- Keep all work on feature/learner-email-access; no direct pushes to main.
- Create an isolated Supabase development branch only after explicit approval of its quoted recurring cost.
- Keep production database and Worker untouched until migration, integration tests, and smoke tests pass.

### 1. Database migration
- Add the allowlist schema, constraints, claim function, indexes, RLS policies, table grants, and targeted privilege corrections.
- Inspect generated SQL, test migration on the Supabase development branch, inspect policy/grant state after migration, and generate updated TypeScript DB types.
- Verify owner/admin tables and role metadata remain unchanged.

### 2. Server enforcement
- Use the authenticated atomic claim RPC for verified-email lookup and one-time linking.
- Implement active-learner middleware.
- Protect syncProgress, loadProgress, and all other learner data functions; audit every server function and storage endpoint used by learning routes.
- Add admin-only learner authorisation functions without modifying existing admin-role functions.

### 3. Application and admin UI
- Add learner access status to the study/auth state without using client state as authority.
- Gate each learning route centrally and update navigation/auth states.
- Add the dedicated Learner access admin section.
- Remove automatic guest-to-account merge; preserve local records and present no implicit import.

### 4. Verification
Run unit/type/lint/build/question-bank audit and Playwright browser checks. Add database/RLS integration cases for:
- Unauthenticated visitor cannot use learning routes or learner endpoints.
- Signed-in but unapproved user is denied.
- Pre-authorised verified email links once and gains access.
- Same linked UUID can return and remains authorised.
- A different UUID cannot take an already-linked email.
- Disabled learner loses protected API/cloud progress access.
- Restored learner regains access without changing the original link.
- Learner can read/write only their own profile/progress.
- anon cannot read/write learner records.
- Existing admin can use /admin without implicit learner access.
- Owner/admin role grants and existing admin verification still work unchanged.
- User cannot change access by editing user metadata or request payloads.
- Old guest data is not auto-merged.

### 5. Pull request and production
- Open a PR from feature/learner-email-access into main; review migration, generated types, RLS grants/policies, server-only imports, and route coverage.
- Require green CI, built-Worker browser smoke, and database integration results before merge.
- A production deployment workflow does not currently exist. Add one as a separate protected release step using a GitHub production environment, deployment-only Cloudflare API token, and explicit approval. Do not place the Supabase service-role value in workflow output.
- Back up and inspect production schema/privileges before applying the reviewed migration. Apply once, verify access behaviour, then deploy the matching Worker release.
- Run production smoke checks using test accounts representing approved, pending, disabled, and admin-only states. Do not use or alter real learner accounts for test fixtures.
- Keep rollback steps ready: revert Worker code first if application behaviour regresses; database rollback must preserve learner records and audit history rather than dropping the authorisation table.

## Current verified environment facts

- GitHub feature branch: feature/learner-email-access, based on production main commit a4c5bc45d4e1ab4709a2861591c958b08fbe9bef.
- Supabase project: qfolceulguweezxjvvjt (eu-west-1), currently healthy. The Worker uses the publishable key and authenticated RPCs; do not add a service-role key to the Worker for this feature.
- Supabase development branch creation was quoted at USD 0.01344/hour. It has not been created because cost approval is outstanding.
- Cloudflare Worker: k53-master-sa-remixv-02. Its current secret names include SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY; SUPABASE_SERVICE_ROLE_KEY is absent.
- Repository CI currently runs typecheck, unit tests, lint, build, and question-bank audit. A production browser smoke workflow exists. There is no production deploy workflow in the repository.
- Production admin-owner access fix is already merged and must remain untouched.
