# Free local Google OAuth browser test

This procedure uses the Supabase CLI local stack and a dedicated Google OAuth web client. It creates no hosted Supabase branch and makes no changes to the production Supabase project or Cloudflare Worker. Docker is required locally.

## 1. Create a separate Google OAuth client

In Google Cloud Console, create a separate OAuth 2.0 **Web application** client for local testing. Do not reuse the production client.

Configure the Google Auth Platform consent screen for testing. Add these accounts to its test-user list:
- The existing K53 owner account, `aiamplifysa@gmail.com`, so the local `/admin` page can pre-authorise test learners.
- A separate Google account for an approved learner.
- A separate Google account for an unapproved learner.

Create the Web application OAuth client with this **Authorised JavaScript origin**:

```text
http://127.0.0.1:4173
```

Add this exact **Authorised redirect URI**:

```text
http://127.0.0.1:54321/auth/v1/callback
```

The Google redirect URI is the local Supabase Auth callback, not the app's `/auth` route. No production hostname or production Supabase callback is needed for this test.

## 2. Configure local-only credentials

In the repository root, create or edit the git-ignored local `.env` file and set:

```dotenv
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your-local-google-client-id
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET=your-local-google-client-secret
```

Do not send these values in chat or commit them. The repository's `.gitignore` excludes `.env` and `.env.*`.

Do not edit the tracked `supabase/config.toml`. The next step adds Google provider settings only to the temporary local workspace.

## 3. Start an isolated local Supabase stack

Use the same disposable migration workspace approach as CI so the K53 base schema is applied before the learner-access migration:

```bash
mkdir -p /tmp/k53-supabase/supabase/migrations
cp supabase/config.toml /tmp/k53-supabase/supabase/config.toml
cp supabase/tests/learner-access-local-setup.sql /tmp/k53-supabase/supabase/migrations/20261119165900_k53_test_base_schema.sql
cp supabase/migrations/20261119170000_learner_email_access.sql /tmp/k53-supabase/supabase/migrations/
cp .env /tmp/k53-supabase/.env

# Give this disposable local stack a project ID distinct from production.
python3 - <<'PY'
from pathlib import Path
config = Path("/tmp/k53-supabase/supabase/config.toml")
contents = config.read_text()
contents = contents.replace(
    'project_id = "qfolceulguweezxjvvjt"',
    'project_id = "k53-local-oauth-test"',
)
config.write_text(contents)
PY
```

Edit the existing `[auth]` section in `/tmp/k53-supabase/supabase/config.toml`; do not add a second `[auth]` header. Set these values in that existing section:

```toml
site_url = "http://127.0.0.1:4173"
additional_redirect_urls = ["http://127.0.0.1:4173/**"]
```

Then add the Google provider section once:

```toml
[auth.external.google]
enabled = true
client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET)"
skip_nonce_check = false
```

Keep any other existing `[auth]` settings unchanged.

Start the disposable local stack:

```bash
cd /tmp/k53-supabase
supabase start
supabase status
```

The temporary workspace has its own local project ID and copied local credentials. Do not run `supabase link`. Start and test only this local stack; no command in this procedure targets the hosted project. The local Google callback is `http://127.0.0.1:54321/auth/v1/callback`.

## 4. Build and run the Worker against local Supabase

In the application repository, use the local API URL and anon key from `supabase status -o env`:

```bash
cd /path/to/k53-master-sa-remixv.02
set -a
eval "$(cd /tmp/k53-supabase && supabase status -o env)"
set +a
export VITE_SUPABASE_URL="$API_URL"
export VITE_SUPABASE_PUBLISHABLE_KEY="$ANON_KEY"
export SUPABASE_URL="$API_URL"
export SUPABASE_PUBLISHABLE_KEY="$ANON_KEY"
npm run build
npx wrangler dev --config .output/server/wrangler.json --ip 127.0.0.1 --port 4173 --local
```

Open `http://127.0.0.1:4173/auth`. The auth route deliberately uses the local origin for localhost even in a production-mode build. The local Supabase redirect allow-list includes that same origin.

## 5. Verify the real Google provider round trip

Use the owner Google account and the two separate learner test accounts added to the Google consent screen. Against the local stack only:

1. Confirm `http://127.0.0.1:54321/auth/v1/settings` reports Google enabled.
2. Open `http://127.0.0.1:4173/auth`, sign in with the owner account, and confirm Google returns through the local Supabase callback to the app.
3. Open the local `/admin` page and pre-authorise the approved learner's exact Google email address.
4. Sign out, then sign in with the approved learner account. Confirm the account page reports active access and the learner can open learning features.
5. Sign out, then sign in with the unapproved learner account. Confirm the account remains pending and learning features are blocked.
6. In local Supabase Studio or the local database, verify the approved email's `learner_access.user_id` matches that learner's local `auth.users.id`. Sign out and sign in again; confirm the UUID binding is unchanged.
7. Confirm the owner account can still access local `/admin` and manage the test learner authorisations.

The owner account is needed because the database's existing owner-admin check is tied to `aiamplifysa@gmail.com`. This authentication creates a user/session only in the disposable local Auth database; it does not sign into or modify production. The existing GoTrue/PostgREST CI integration covers database/RLS behavior with test JWTs; this browser test covers the actual external Google consent and callback.

## 6. Shut down and clean up

Stop the Worker with Ctrl+C, then stop and remove the disposable local Supabase stack:

```bash
cd /tmp/k53-supabase
supabase stop --no-backup
rm -rf /tmp/k53-supabase
```

Remove the two Google OAuth variables from the repository-root `.env` after testing. Delete that file only if it was created solely for this test; preserve any pre-existing local environment settings. Never add credentials, auth tokens, or generated local secrets to Git.

## Release boundary

This procedure is local-only. Do not point the application at the production Supabase URL, add production credentials to the local setup, apply the migration to production, merge PR #19, or deploy the Worker as part of this test. PR #19 remains draft and unmerged pending explicit approval.

References:
- [Supabase local CLI configuration and environment variables](https://supabase.com/docs/guides/local-development/cli/config)
- [Supabase Google OAuth setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase CLI v3 migration and local-by-default behavior](https://supabase.com/docs/guides/local-development/cli/migrating-to-v3)
