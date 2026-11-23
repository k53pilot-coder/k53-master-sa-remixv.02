const PRODUCTION_SUPABASE_URL = "https://qfolceulguweezxjvvjt.supabase.co";
const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";

/**
 * Keep production verification pinned to the canonical K53 project.
 * Permit only the exact loopback Supabase URL for disposable local OAuth tests.
 */
export function getAdminVerificationSupabaseUrl(configuredUrl?: string): string {
  return configuredUrl === LOCAL_SUPABASE_URL
    ? LOCAL_SUPABASE_URL
    : PRODUCTION_SUPABASE_URL;
}
