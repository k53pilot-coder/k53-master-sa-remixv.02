import { createMiddleware, createServerFn } from "@tanstack/react-start";
import type { User } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ADMIN_OWNER_EMAIL, getAdminRole } from "@/lib/admin-role";
import { verifyAdminAccess } from "@/lib/admin-verification";
import { getAdminVerificationSupabaseUrl } from "@/lib/admin-verification-url";

export const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ context, next }) => {
    // requireSupabaseAuth has already verified this JWT with Supabase.
    // Use its trusted claims directly; another Auth API request is unnecessary.
    const role = getAdminRole(context.claims);
    if (!role) throw new Error("Forbidden: Admin access is required");

    return next({ context: { adminRole: role } });
  });

const adminAccessSchema = z
  .object({
    accessToken: z.string().min(1).max(8192),
    // This is the public Supabase publishable key already used by the browser.
    // It is not an authorization credential; the user JWT remains the sole proof of identity.
    publishableKey: z.string().startsWith("sb_publishable_").max(256),
  })
  .strict();

// Production verification remains pinned to K53's canonical project. The only
// allowed override is the exact loopback URL used by the disposable local test.
export const getAdminAccess = createServerFn({ method: "POST" })
  .validator((input: unknown) => adminAccessSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      const result = await verifyAdminAccess({
        supabaseUrl: getAdminVerificationSupabaseUrl(process.env["SUPABASE_URL"]),
        publishableKey: data.publishableKey,
        accessToken: data.accessToken,
      });
      return { role: result.role, userId: result.userId };
    } catch (error: unknown) {
      const status =
        error && typeof error === "object" && "status" in error &&
        typeof error.status === "number" ? error.status : undefined;
      const message = error instanceof Error ? error.message : "Unknown admin verification error";
      console.error("Admin session verification failed", { status, message });
      throw error;
    }
  });

const grantAdminAccessSchema = z
  .object({
    email: z.string().trim().email().max(254),
  })
  .strict();

export const grantAdminAccess = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => grantAdminAccessSchema.parse(input))
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase();
    if (email === ADMIN_OWNER_EMAIL) {
      throw new Error("The primary owner already has admin access.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let page = 1;
    let target: User | undefined;

    while (page <= 100) {
      const { data: result, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      if (error) {
        console.error("Could not look up admin invitee", error);
        throw new Error("Could not verify that email account.");
      }

      const match = result.users.find((user) => user.email?.toLowerCase() === email);
      if (match) {
        target = match;
        break;
      }
      if (result.nextPage === null) break;
      page = result.nextPage;
    }

    if (!target) {
      if (page > 100)
        throw new Error("User lookup reached its safe page limit. Contact the owner.");
      throw new Error(
        "No account was found for that email. The person must create an account first.",
      );
    }

    const existingRoles = Array.isArray(target.app_metadata["roles"])
      ? target.app_metadata["roles"].filter((role): role is string => typeof role === "string")
      : [];
    if (existingRoles.includes("admin")) {
      return { email, role: "admin" as const, alreadyAdmin: true };
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(target.id, {
      app_metadata: {
        ...target.app_metadata,
        roles: [...existingRoles, "admin"],
      },
    });
    if (error) {
      console.error("Could not grant admin access", error);
      throw new Error("Could not grant admin access.");
    }

    return { email, role: "admin" as const, alreadyAdmin: false };
  });
