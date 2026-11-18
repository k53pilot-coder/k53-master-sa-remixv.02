import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CloudCheck, LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useStudy } from "@/components/study-provider";
import { pageHead } from "@/lib/metadata";
import { useLanguage } from "@/components/language-provider";

function authErrorMessage(error: unknown): string {
  const detail = error instanceof Error ? error.message.toLowerCase() : "";
  if (detail.includes("missing supabase environment variable")) {
    return "Sign-in is not configured for this deployment. Contact support.";
  }
  if (detail.includes("provider") && (detail.includes("not enabled") || detail.includes("unsupported"))) {
    return "Google sign-in is not enabled for this project yet. Please contact support.";
  }
  if (detail.includes("rate limit") || detail.includes("too many requests")) {
    return "Too many attempts. Wait a little while, then try again.";
  }
  if (detail.includes("failed to fetch") || detail.includes("network")) {
    return "Could not reach the sign-in service. Check your connection and try again.";
  }
  return "Could not complete this request. Check your connection and try again.";
}

export const Route = createFileRoute("/auth")({
  head: () =>
    pageHead(
      "Your learner account",
      "Create or access your K53 learner account securely with Google.",
    ),
  component: Auth,
});

export function Auth() {
  const { user, name, refresh, progress } = useStudy();
  const { tr } = useLanguage();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [display, setDisplay] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function signInWithGoogle() {
    setBusy(true);
    setMessage("");
    try {
      // Production OAuth must always return to the canonical live K53 site.
      // Local development keeps returning to the local development origin.
      const redirectTo = import.meta.env.PROD
        ? "https://k53.aiamplifysa.com/auth"
        : new URL("/auth", window.location.origin).toString();

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Could not start Google sign-in", error);
      setMessage(tr(authErrorMessage(error)));
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return (
      <>
        <div className="page-heading">
          <div>
            <span className="eyebrow">{tr("YOUR LEARNER PROFILE")}</span>
            <h1>{tr("Hi,")} {name}.</h1>
            <p>{tr("Your learning journey, wherever you go.")}</p>
          </div>
        </div>
        <div className="auth-panel">
          <UserRound size={32} aria-hidden="true" />
          <label>
            {tr("Display name")}
            <Input defaultValue={name} onChange={(event) => setDisplay(event.target.value)} />
          </label>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const { error } = await supabase.from("profiles").upsert({
                  id: user.id,
                  display_name: display || name,
                  vehicle: progress.vehicle,
                });
                if (error) throw error;
                setMessage(tr("Profile saved."));
                await refresh();
              } catch (error) {
                console.error("Could not save learner profile", error);
                setMessage(tr("Could not save your profile. Please try again."));
              } finally {
                setBusy(false);
              }
            }}
          >
            {tr("Save profile")}
          </Button>
          <Button variant="outline" onClick={() => void refresh()}>
            <CloudCheck aria-hidden="true" />
            {tr("Sync progress")}
          </Button>
          <p role="status" aria-live="polite">{message}</p>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await queryClient.cancelQueries();
                queryClient.clear();
                const { error } = await supabase.auth.signOut();
                if (error) throw error;
                await router.invalidate();
                await navigate({ to: "/auth", replace: true });
              } catch (error) {
                console.error("Could not sign out", error);
                setMessage(tr("Could not sign out. Please try again."));
              } finally {
                setBusy(false);
              }
            }}
          >
            <LogOut aria-hidden="true" />
            {tr("Sign out")}
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{tr("TAKE YOUR PROGRESS WITH YOU")}</span>
          <h1>{tr("Welcome to your learning space.")}</h1>
          <p>
            {tr("Use a Google account to create your learner account or sign in to sync progress. You can study without an account.")}
          </p>
        </div>
      </div>
      <div className="auth-panel">
        <Button
          className="w-full"
          variant="outline"
          disabled={busy}
          onClick={() => void signInWithGoogle()}
        >
          {busy ? tr("Please wait…") : tr("Continue with Google")}
        </Button>
        <p className="text-sm text-muted-foreground">
          {tr("First-time sign-ins create your learner account automatically.")}
        </p>
        <p className="text-xs text-muted-foreground">
          {tr("Your account's email verification is handled by Google.")}
        </p>
        <p role="status" aria-live="polite">{message}</p>
      </div>
    </>
  );
}
