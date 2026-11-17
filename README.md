# K53 Master SA

Bilingual South African K53 learner preparation application.

## Stack

- React 19 and TanStack Start
- Vite, Tailwind CSS and Nitro
- Cloudflare Workers for application hosting
- Supabase Auth and Postgres for accounts and progress synchronization
- IndexedDB for local/offline learner progress

## Authentication

The application uses Google OAuth only. A first-time Google sign-in creates the learner account in Supabase. Email/password, email OTP, and password-reset authentication are not part of the learner flow.

Before production release, configure the Google provider and production redirect URLs in Supabase. Configure custom SMTP with the publisher's verified sender address when Supabase Auth email notifications are required. See [AUTHENTICATION_SETUP.md](./AUTHENTICATION_SETUP.md).

## Development

Requirements: Node.js and Bun.

```sh
git clone https://github.com/k53pilot-coder/k53-master-sa-remixv.02.git
cd k53-master-sa-remixv.02
bun install --frozen-lockfile
bun run dev
```

## Quality checks

```sh
bun run typecheck
bun run test
bun run lint
bun run build
bun run audit:questions
```

The build creates the Cloudflare Worker output in `.output/`. Production changes are deployed through the repository's configured Cloudflare Workers Build integration after CI validation.
