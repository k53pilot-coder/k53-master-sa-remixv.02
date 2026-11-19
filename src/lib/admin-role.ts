export type AdminRole = "owner" | "admin";
export const ADMIN_OWNER_EMAIL = "aiamplifysa@gmail.com";
type Claims = { email?: unknown; app_metadata?: { provider?: unknown; providers?: unknown; role?: unknown; roles?: unknown } };
function hasGoogleIdentity(claims: Claims): boolean {
  const metadata = claims.app_metadata;
  return !!metadata && typeof metadata === "object" &&
    (metadata.provider === "google" || (Array.isArray(metadata.providers) && metadata.providers.includes("google")));
}
export function getAdminRole(claims: unknown): AdminRole | null {
  if (!claims || typeof claims !== "object") return null;
  const trusted = claims as Claims;
  if (!hasGoogleIdentity(trusted)) return null;
  const email = typeof trusted.email === "string" ? trusted.email.trim().toLowerCase() : "";
  if (email === ADMIN_OWNER_EMAIL) return "owner";
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

  // This controls navigation visibility only. The server independently verifies
  // the current Google identity before granting owner access.
  if (email === ADMIN_OWNER_EMAIL) return true;
  if (!hasGoogleIdentity(trusted)) return false;
  const metadata = trusted.app_metadata;
  if (!metadata || typeof metadata !== "object") return false;
  const roles = Array.isArray(metadata.roles) ? metadata.roles : [];
  return metadata.role === "owner" || metadata.role === "admin" || roles.includes("owner") || roles.includes("admin");
}
