import { createMiddleware } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LearnerAccessStatus = "active" | "pending" | "disabled";

/**
 * Resolves the Supabase user from the verified bearer token, then atomically
 * claims an active email pre-authorisation. The browser never supplies the
 * email or user UUID used for the claim.
 */
export const requireLearnerAccess = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ context, next }) => {
    const { data: claim, error: claimError } = await context.supabase.rpc(
      "claim_learner_access",
    );

    if (claimError) {
      console.error("Could not resolve learner authorisation", claimError);
      throw new Error("Learner access could not be verified");
    }

    const status = (claim?.[0]?.access_status ?? "pending") as LearnerAccessStatus;
    if (status !== "active") {
      throw new Error(
        status === "disabled"
          ? "Forbidden: learner access is disabled"
          : "Forbidden: this email has not been authorised for learning",
      );
    }

    return next({ context: { learnerAccessStatus: status } });
  });

/** Lightweight status endpoint middleware: identity only, status is returned by
 * the handler so pending and disabled users can see an explanatory screen. */
export const requireLearnerIdentity = requireSupabaseAuth;
