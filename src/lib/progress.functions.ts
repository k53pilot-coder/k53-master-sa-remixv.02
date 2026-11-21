import { createServerFn } from "@tanstack/react-start";
import { requireLearnerAccess } from "@/integrations/supabase/learner-access-middleware";
import { syncProgressSchema } from "@/lib/progress.schemas";
export const syncProgress = createServerFn({ method: "POST" })
  .middleware([requireLearnerAccess])
  .validator((input: unknown) => syncProgressSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (data.attempts.length) {
      const { error } = await context.supabase.from("question_attempts").upsert(
        data.attempts.map((a) => ({ ...a, user_id: context.userId })),
        { onConflict: "id", ignoreDuplicates: true },
      );
      if (error) throw new Error("Could not sync answers");
    }
    if (data.tests.length) {
      const { error } = await context.supabase.from("test_attempts").upsert(
        data.tests.map((t) => ({ ...t, user_id: context.userId, results: t.results as never })),
        { onConflict: "id", ignoreDuplicates: true },
      );
      if (error) throw new Error("Could not sync tests");
    }
    return { saved: true };
  });
export const loadProgress = createServerFn({ method: "GET" })
  .middleware([requireLearnerAccess])
  .handler(async ({ context }) => {
    const [{ data: attempts, error: a }, { data: tests, error: t }, { data: profile }] =
      await Promise.all([
        context.supabase
          .from("question_attempts")
          .select("id,question_id,category,correct,created_at")
          .eq("user_id", context.userId)
          .order("created_at"),
        context.supabase
          .from("test_attempts")
          .select("id,mode,results,created_at")
          .eq("user_id", context.userId)
          .order("created_at"),
        context.supabase
          .from("profiles")
          .select("display_name,vehicle")
          .eq("id", context.userId)
          .maybeSingle(),
      ]);
    if (a || t) throw new Error("Could not read saved progress");
    return { attempts: attempts ?? [], tests: tests ?? [], profile };
  });
