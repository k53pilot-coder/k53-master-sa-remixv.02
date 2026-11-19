# Free local Google OAuth browser test

This procedure uses the Supabase CLI local stack and a dedicated Google OAuth web client. It creates no hosted Supabase branch and makes no changes to the production Supabase project or Cloudflare Worker. Docker is required locally.

## 1. Create a separate Google OAuth client

In Google Cloud Console, create an OAuth 2.0 **Web application** client dedicated to local testing. Do not reuse the production client if you can avoid it.

Add this exact authorised redirect URI:

```text
http://127.0.0.1:54321/auth/v1/callback
```

The Google client ID and secret are used only by the local Supabase Auth service. The Google callback is the Supabase callback above, not the app's `/auth` route.

## 2. Configure local Supabase Auth

In the repository root, create or edit the local-only `.env` file (never commit it) and set:

```dotenv
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your-local-google-client-id
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET=your-local-google-client-secret
```

Add the following local settings to `supabase/config.toml`. Keep the client ID and secret as environment references; do not paste credentials into TOML:

```toml
[auth]
site_url = "http://127.0.0.1:4173"
additional_redirect_urls = ["http://127.0.0.1:4173/**"]

[auth.external.google]
enabled = true
client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET)"
skip_nonce_check = false
```

These settings are local development configuration. Do not link the local CLI to the hosted production project or run `supabase db push`.

## 3. Start the local stack and apply the feature schema

Use the same isolated migration workspace approach as CI so the existing K53 base schema is applied before the learner-access migration:

```bash
mkdir -p /tmp/k53-supabase/supabase/migrations
cp supabase/config.toml /tmp/k53-supabase/supabase/config.toml
cp supabase/tests/learner-access-local-setup.sql /tmp/k53-supabase/supabase/migrations/20261119165900_k53_test_base_schema.sql
cp supabase/migrations/20261119170000_learner_email_access.sql /tmp/k53-supabase/supabase/migrations/
cp .env /tmp/k53-supabase/.env
cd /tmp/k53-supabase
supabase start
supabase status
```

The `.env` copy is local to the temporary directory. Keep it private. The local Auth callback is `http://127.0.0.1:54321/auth/v1/callback`.

## 4. Build and run the Worker against local Supabase

In the application repository, use the local API URL and anon key printed by `supabase status -o env`. Example:

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

Open `http://127.0.0.1:4173/auth`. The auth route deliberately uses the local origin for localhost even in a production-mode build. The local Supabase redirect allow-list must include that same origin.

## 5. Verify the real provider round trip

Use a dedicated Google test account. In the local Supabase stack, verify:

1. `/auth/v1/settings` reports Google enabled.
2. The app's Continue with Google button redirects to Google's actual consent/sign-in page.
3. Google returns to the local Supabase callback, then back to `http://127.0.0.1:4173/auth`.
4. Supabase creates/authenticates the user with a verified Google email.
5. Pre-authorise that exact email in the local database using the owner/admin test identity, then repeat sign-in and verify the atomic learner claim binds to the local Auth UUID.
6. Confirm an unapproved email remains pending and cannot access learning; confirm the approved email can access learning.
7. Confirm sign-out and a subsequent sign-in retain the same UUID binding.

The existing GoTrue/PostgREST CI integration already covers the database/RLS side with password-grant test users. This browser procedure is specifically for the external Google provider and redirect/callback round trip.

## 6. Shut down

Stop the Worker with Ctrl+C, then:

```bash
cd /tmp/k53-supabase
supabase stop --no-backup
```

Remove the temporary stack directory and local `.env` when finished. Never add credentials, auth tokens, or generated local secrets to Git.

## Release boundary

This is a local-only verification procedure. Do not point it at the production Supabase URL, register production credentials in the local test setup, apply the migration to production, merge PR #19, or deploy the Worker as part of this test.

References:
- [Supabase local CLI configuration](https://supabase.com/docs/guides/local-development/cli/config)
- [Supabase Google OAuth setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
