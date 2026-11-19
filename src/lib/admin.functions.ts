import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import type { User } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ADMIN_OWNER_EMAIL, getAdminRole } from "@/lib/admin-role";

export const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ context, next }) => {
    // JWT claims can contain stale app_metadata after a provider is linked.
    // Fetch the current Auth user so linked Google identities are recognised.
    const request = getRequest();
    const authorization = request?.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : "";
    if (!token) throw new Error("Unauthorized: Missing access token");

    const { data, error } = await context.supabase.auth.getUser(token);
    if (error || !data.user) {
      throw new Error("Unauthorized: Could not verify signed-in user");
    }

    const role = getAdminRole(data.user);
    if (!role) throw new Error("Forbidden: Admin access is required");

    return next({ context: { adminRole: role } });
  });

export const getAdminAccess = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(({ context }) => ({ role: context.adminRole }));

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
