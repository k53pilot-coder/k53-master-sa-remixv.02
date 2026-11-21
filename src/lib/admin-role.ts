export type AdminRole = "owner" | "admin";
export const ADMIN_OWNER_EMAIL = "aiamplifysa@gmail.com";

type Claims = {
  email?: unknown;
  email_confirmed_at?: unknown;
  identities?: unknown;
  app_metadata?: {
    provider?: unknown;
    providers?: unknown;
    role?: unknown;
    roles?: unknown;
  };
};

function hasGoogleIdentity(claims: Claims): boolean {
  const metadata = claims.app_metadata;
  const providerMetadata =
    !!metadata &&
    typeof metadata === "object" &&
    (metadata.provider === "google" ||
      (Array.isArray(metadata.providers) && metadata.providers.includes("google")));
  const linkedIdentity =
    Array.isArray(claims.identities) &&
    claims.identities.some(
      (identity) =>
        !!identity &&
        typeof identity === "object" &&
        "provider" in identity &&
        identity.provider === "google",
    );
  return providerMetadata || linkedIdentity;
}

function hasConfirmedOwnerEmail(claims: Claims, email: string): boolean {
  return (
    email === ADMIN_OWNER_EMAIL &&
    typeof claims.email_confirmed_at === "string" &&
    claims.email_confirmed_at.trim().length > 0
  );
}

export function getAdminRole(claims: unknown): AdminRole | null {
  if (!claims || typeof claims !== "object") return null;
  const trusted = claims as Claims;
  const email = typeof trusted.email === "string" ? trusted.email.trim().toLowerCase() : "";

  // The fixed owner account is authorized only when Supabase Auth confirms
  // its email. The caller must pass an authoritative Supabase user record.
  if (email === ADMIN_OWNER_EMAIL) {
    return hasConfirmedOwnerEmail(trusted, email) ? "owner" : null;
  }

  if (!hasGoogleIdentity(trusted)) return null;
  const metadata = trusted.app_metadata;
  if (!metadata || typeof metadata !== "object") return null;
  const roles = Array.isArray(metadata.roles) ? metadata.roles : [];
  const role = metadata.role;
  if (role === "owner" || roles.includes("owner")) return "owner";
  if (role === "admin" || roles.includes("admin")) return "admin";
  return null;
}

export function mayRequestAdminAccess(claims: unknown): boolean {
  if (!claims || typeof claims !== "object") return false;
  const trusted = claims as Claims;
  const email = typeof trusted.email === "string" ? trusted.email.trim().toLowerCase() : "";

  // Navigation visibility only; server-side authorization independently
  // verifies the authoritative Supabase user and confirmation timestamp.
  if (email === ADMIN_OWNER_EMAIL) return hasConfirmedOwnerEmail(trusted, email);
  if (!hasGoogleIdentity(trusted)) return false;
  const metadata = trusted.app_metadata;
  if (!metadata || typeof metadata !== "object") return false;
  const roles = Array.isArray(metadata.roles) ? metadata.roles : [];
  return (
    metadata.role === "owner" ||
    metadata.role === "admin" ||
    roles.includes("owner") ||
    roles.includes("admin")
  );
}
