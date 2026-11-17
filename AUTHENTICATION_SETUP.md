# Authentication setup — K53 Master SA

The learner application intentionally supports Google OAuth only. A first-time Google sign-in automatically creates a Supabase user account. Email/password sign-up, email/password login, email OTP, and password-reset authentication are not exposed by the application.

## Production configuration audit

The public Supabase Auth settings endpoint was checked on 17 November 2026:

- Google provider: disabled
- Email provider: enabled
- New account sign-up: enabled
- Supabase email auto-confirm: disabled

Do not deploy the Google-only app changes until Google provider setup is complete.

## Google OAuth configuration

1. In Google Cloud Console, create or select the K53 Master SA project.
2. Create an OAuth client ID of type **Web application**.
3. Add authorized JavaScript origin `https://k53.aiamplifysa.com`.
4. Add this exact authorized redirect URI: `https://qfolceulguweezxjvvjt.supabase.co/auth/v1/callback`.
5. In Supabase Dashboard → Authentication → Providers → Google, enable Google and enter the Google client ID and client secret.
6. In Supabase Dashboard → Authentication → URL Configuration, set Site URL to `https://k53.aiamplifysa.com` and allow `https://k53.aiamplifysa.com/auth` as the application redirect. Add local development callback separately only if needed.
7. Re-check `/auth/v1/settings` using the publishable key. `external.google` must be `true`.
8. After successful Google registration and sign-in tests, disable the Supabase Email provider to enforce Google-only auth at the backend. Keep `disable_signup=false` so first-time Google identities may create accounts.

## Verification email sender

Requested sender: **info@aiamplifysa.com**.

Supabase cannot send from an arbitrary address merely because it is entered in source code. A transactional email provider account and SMTP credentials are required. In Supabase Dashboard → Authentication → SMTP Settings, configure:

- Sender email: `info@aiamplifysa.com`
- Sender name: `K53 Master SA`
- SMTP host and port from the email provider
- SMTP username and password from the email provider

Publish the provider's SPF and DKIM records in the `aiamplifysa.com` DNS zone and configure a suitable DMARC policy. Test delivery before relying on Auth notifications.

With Google-only sign-in, Google verifies the user's identity and verified email during OAuth. The app does not send an email/password confirmation link. Custom SMTP remains relevant for Supabase Auth notifications enabled in future, such as secure email changes or invitations.

## Release gate

Do not deploy until Google OAuth is enabled and verified, the callback returns to `/auth`, first-time Google account creation works, existing Google sign-in works, and Google-only admin authorization passes. Disable the Supabase Email provider after confirming the Google flow. Confirm sender `info@aiamplifysa.com` through a verified SMTP provider if Auth email notifications are used.

Never commit OAuth client secrets, SMTP passwords, Supabase access tokens, or service-role keys.
