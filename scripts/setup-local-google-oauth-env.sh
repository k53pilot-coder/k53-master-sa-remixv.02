#!/usr/bin/env bash
set -euo pipefail

# Run this script from the K53 repository root after creating a dedicated
# Google OAuth Web application client. It writes credentials to .env only.

if [[ ! -f .gitignore ]] || ! grep -qE '^\.env(\.|$)|^\.env$' .gitignore; then
  echo "ERROR: .gitignore does not appear to ignore .env. Refusing to write credentials." >&2
  exit 1
fi

if ! git check-ignore -q .env; then
  echo "ERROR: .env is not ignored by Git in this directory. Refusing to write credentials." >&2
  exit 1
fi

umask 077
tmp_file="$(mktemp .env.tmp.XXXXXX)"
cleanup() {
  rm -f "$tmp_file"
  unset GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET || true
}
trap cleanup EXIT INT TERM

if [[ -f .env ]]; then
  grep -vE '^SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_(ID|SECRET)=' .env > "$tmp_file" || true
fi

read -r -p "Google OAuth Client ID: " GOOGLE_CLIENT_ID
read -r -s -p "Google OAuth Client Secret: " GOOGLE_CLIENT_SECRET
printf '\n'

if [[ -z "$GOOGLE_CLIENT_ID" || -z "$GOOGLE_CLIENT_SECRET" ]]; then
  echo "ERROR: Both values are required. No credentials were written." >&2
  exit 1
fi

{
  cat "$tmp_file"
  printf 'SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=%s\n' "$GOOGLE_CLIENT_ID"
  printf 'SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET=%s\n' "$GOOGLE_CLIENT_SECRET"
} > .env

chmod 600 .env
printf 'Saved Google OAuth credentials to %s/.env (mode 600).\n' "$PWD"
printf 'Verified: Git ignores .env. The client secret was not printed.\n'
