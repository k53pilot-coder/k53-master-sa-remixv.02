# K53 Master SA repository instructions

- Keep learning content in browser-safe static modules and quiz scoring in pure functions so study does not require database round-trips.
- Render road signs from documented source-chart crops; never substitute generic icons for unverified signs.
- Keep local study records isolated per learner in IndexedDB; synchronize idempotent batches through authenticated server functions and never cache private server responses.
- Offline support uses generateSW with one preview-safe registrar; navigation is NetworkFirst and OAuth is excluded.
- Public account access is Google OAuth only. Do not reintroduce email/password, email OTP, or additional identity providers without an explicit product decision.
- Supabase owns identity and persistence. Never put service-role keys, SMTP credentials, OAuth client secrets, Supabase access tokens, or other server secrets in source files, `VITE_*` variables, or Git.
- Configure Google OAuth and Supabase Auth redirect allow-lists in Supabase before promoting authentication changes to production.
- Authentication emails must use the verified publisher sender `info@aiamplifysa.com` through a configured custom SMTP provider. An email address alone is not sufficient SMTP configuration.
- Keep the Cloudflare Nitro preset and output path compatible with the production Worker.
- Do not manually edit the generated TanStack route tree; it is rebuilt from files in `src/routes/`.
- Do not rewrite published Git history. Do not force-push, rebase, amend, or squash commits already pushed to a shared branch.
- Preserve the current database schema and migrations unless a separate reviewed database change is explicitly required.
- Any change to sign-in or admin authorization must include tests proving that non-Google identities cannot access protected admin functions.
