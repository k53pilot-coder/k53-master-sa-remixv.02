import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/admin.functions";
export const getLearnerAccessStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: claim, error: claimError } = await context.supabase.rpc(
      "claim_learner_access",
    );
    if (claimError) {
      console.error("Could not resolve learner access status", claimError);
      throw new Error("Learner access status is unavailable");
    }
    const status = claim?.[0]?.access_status ?? "pending";
    return {
      status: status === "active" || status === "disabled" || status === "unverified" || status === "google_required"
        ? status
        : "pending",
    };
  });

const addSchema = z.object({ email: z.string().trim().email().max(254) }).strict();
export const addLearnerAccess = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => addSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("admin_add_learner_access", {
      p_email: data.email.trim().toLowerCase(),
    });
    if (error) {
      // Keep the database's actual failure code and message available to the
      // owner-facing admin form. The generic UI message previously hid whether
      // this was an authorization, schema-cache, validation, or database error.
      console.error("Could not authorise learner email", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw new Error(
        `Could not authorise learner email [${error.code || "unknown"}]: ${error.message}`,
      );
    }
    return result?.[0] ?? null;
  });

const listSchema = z.object({ search: z.string().trim().max(254).default("") }).strict();
export const listLearnerAccess = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((input: unknown) => listSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("admin_list_learner_access", {
      p_search: data.search.toLowerCase(),
    });
    if (error) {
      console.error("Could not list learner authorisations", error);
      throw new Error("Could not load learner authorisations");
    }
    return rows ?? [];
  });

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["active", "disabled"]),
}).strict();
export const setLearnerAccessStatus = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => statusSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: changed, error } = await context.supabase.rpc("admin_set_learner_access_status", {
      p_id: data.id,
      p_status: data.status,
    });
    if (error) {
      console.error("Could not update learner authorisation", error);
      throw new Error("Could not update learner authorisation");
    }
    if (!changed) throw new Error("Learner authorisation record was not found");
    return { updated: true };
  });
