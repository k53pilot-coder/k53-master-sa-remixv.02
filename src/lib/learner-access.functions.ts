import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/admin.functions";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
const admin = supabaseAdmin as unknown as SupabaseClient;

export const getLearnerAccessStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.auth.getUser(context.accessToken);
    if (error || !data.user || data.user.id !== context.userId) {
      throw new Error("Unauthorized: could not verify learner identity");
    }
    const email = data.user.email?.trim().toLowerCase();
    if (!email || !data.user.email_confirmed_at) {
      return { status: "unverified" as const };
    }
    const { data: claim, error: claimError } = await admin.rpc(
      "claim_learner_access",
      { p_user_id: data.user.id, p_email: email },
    );
    if (claimError) {
      console.error("Could not resolve learner access status", claimError);
      throw new Error("Learner access status is unavailable");
    }
    const status = claim?.[0]?.access_status ?? "pending";
    return {
      status: status === "active" || status === "disabled" ? status : "pending",
    };
  });

const addSchema = z.object({ email: z.string().trim().email().max(254) }).strict();
export const addLearnerAccess = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => addSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await admin.rpc("admin_add_learner_access", {
      p_email: data.email.trim().toLowerCase(),
      p_actor: context.userId,
    });
    if (error) {
      console.error("Could not authorise learner email", error);
      throw new Error("Could not add learner authorisation");
    }
    return result?.[0] ?? null;
  });

const listSchema = z.object({ search: z.string().trim().max(254).default("") }).strict();
export const listLearnerAccess = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((input: unknown) => listSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: rows, error } = await admin.rpc("admin_list_learner_access", {
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
    const { data: changed, error } = await admin.rpc("admin_set_learner_access_status", {
      p_id: data.id,
      p_status: data.status,
      p_actor: context.userId,
    });
    if (error) {
      console.error("Could not update learner authorisation", error);
      throw new Error("Could not update learner authorisation");
    }
    if (!changed) throw new Error("Learner authorisation record was not found");
    return { updated: true };
  });
