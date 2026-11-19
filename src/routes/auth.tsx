import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { CloudCheck, LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useStudy } from "@/components/study-provider";
import { pageHead } from "@/lib/metadata";
import { useLanguage } from "@/components/language-provider";
import { getLearnerAccessStatus } from "@/lib/learner-access.functions";

const PRODUCTION_AUTH_URL = "https://k53.aiamplifysa.com/auth";
const CLOUDFLARE_PREVIEW_HOST_SUFFIX = "-k53-master-sa-remixv-02.aiamplifysa.workers.dev";

export function getOAuthRedirectTo(isProduction: boolean, hostname: string, origin: string): string {
  if (!isProduction) {
    return new URL("/auth", origin).toString();
  }

  // Preserve branch previews for testing, but never let a production build
  // fall back to localhost or the generic workers.dev hostname.
  if (hostname.endsWith(CLOUDFLARE_PREVIEW_HOST_SUFFIX)) {
    return new URL("/auth", origin).toString();
  }

  return PRODUCTION_AUTH_URL;
}

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
  const checkAccess = useServerFn(getLearnerAccessStatus);
  const [accessStatus, setAccessStatus] = useState<"checking" | "active" | "pending" | "disabled" | "unverified" | "error">("checking");
  useEffect(() => {
    if (!user) {
      setAccessStatus("checking");
      return;
    }
    let current = true;
    void checkAccess().then((result) => {
      if (current) setAccessStatus(result.status);
    }).catch((error: unknown) => {
      console.error("Could not verify learner access on account page", error);
      if (current) setAccessStatus("error");
    });
    return () => { current = false; };
  }, [checkAccess, user?.id]);

  async function signInWithGoogle() {
    setBusy(true);
    setMessage("");
    try {
      const redirectTo = getOAuthRedirectTo(
        import.meta.env.PROD,
        window.location.hostname,
        window.location.origin,
      );

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
          <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
            {accessStatus === "active" ? tr("Your learner access is active.")
              : accessStatus === "disabled" ? tr("Your learner access is disabled. Contact the administrator.")
                : accessStatus === "pending" ? tr("Your email has not been authorised for learning yet. Contact the administrator.")
                  : accessStatus === "unverified" ? tr("Verify your Google email address before learning access can be activated.")
                    : accessStatus === "error" ? tr("Learner access could not be checked. Try again when online.")
                      : tr("Checking learner access…")}
          </p>
          {accessStatus === "active" ? <>
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
          </> : null}
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
            {tr("Sign in with the Google email address that an administrator has pre-authorised. All learning features require an active learner authorisation.")}
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
          {tr("Your account is created automatically on first Google sign-in. Learning access activates when your verified email matches an active authorisation.")}
        </p>
        <p className="text-xs text-muted-foreground">
          {tr("Your account's email verification is handled by Google.")}
        </p>
        <p role="status" aria-live="polite">{message}</p>
      </div>
    </>
  );
}
