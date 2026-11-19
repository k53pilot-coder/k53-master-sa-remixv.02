import { getAdminRole, type AdminRole } from "@/lib/admin-role";

export class AdminVerificationError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "AdminVerificationError";
  }
}

type VerifyAdminAccessInput = {
  supabaseUrl: string;
  publishableKey: string;
  accessToken: string;
  fetcher?: typeof fetch;
};

export async function verifyAdminAccess({
  supabaseUrl,
  publishableKey,
  accessToken,
  fetcher = fetch,
}: VerifyAdminAccessInput): Promise<{ role: AdminRole | null; userId: string | null }> {
  let endpoint: URL;
  try {
    endpoint = new URL("/auth/v1/user", supabaseUrl);
  } catch {
    throw new AdminVerificationError("Admin verification is not configured.");
  }

  let response: Response;
  try {
    response = await fetcher(endpoint, {
      method: "GET",
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });
  } catch {
    throw new AdminVerificationError("Supabase Auth could not be reached.");
  }

  if (!response.ok) {
    throw new AdminVerificationError(
      response.status === 401 || response.status === 403
        ? "Your session is not valid. Sign out and sign in again."
        : "Supabase Auth could not verify your session.",
      response.status,
    );
  }

  let user: unknown;
  try {
    user = await response.json();
  } catch {
    throw new AdminVerificationError("Supabase Auth returned an invalid user response.");
  }

  if (!user || typeof user !== "object" || Array.isArray(user)) {
    throw new AdminVerificationError("Supabase Auth returned an invalid user response.");
  }

  const record = user as { id?: unknown };
  return {
    role: getAdminRole(user),
    userId: typeof record.id === "string" ? record.id : null,
  };
}
