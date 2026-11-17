import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, LogOut, UserRound, CloudCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useStudy } from "@/components/study-provider";
import { pageHead } from "@/lib/metadata";
import { useLanguage } from "@/components/language-provider";

function authErrorMessage(error: unknown, af = false): string {
  const detail = error instanceof Error ? error.message.toLowerCase() : "";\n  if (af) {\n    if (detail.includes("missing supabase environment variable")) return "Aanmelding is nie vir hierdie ontplooiing opgestel nie. Koppel Supabase en stel die URL en publiseerbare sleutel in jou gasheeromgewing.";\n    if (detail.includes("invalid login credentials")) return "Die e-posadres of wagwoord is verkeerd. Kontroleer jou besonderhede of stel jou wagwoord terug.";\n    if (detail.includes("email not confirmed")) return "Bevestig jou e-posadres voordat jy aanmeld. Kyk in jou inkassie vir die bevestigingskakel.";\n    if (detail.includes("rate limit") || detail.includes("too many requests")) return "Te veel pogings. Wag ’n rukkie en probeer weer.";\n    if (detail.includes("failed to fetch") || detail.includes("network")) return "Kon nie die aanmeldingsdiens bereik nie. Kontroleer jou internetverbinding en probeer weer.";\n    return "Kon nie die versoek voltooi nie. Kontroleer jou besonderhede en probeer weer.";\n  }
  if (detail.includes("missing supabase environment variable"))
    return "Sign-in is not configured for this deployment. Connect Supabase and set its URL and publishable key in your hosting environment.";
  if (detail.includes("invalid login credentials"))
    return "Email or password is incorrect. Check your details or reset your password.";
  if (detail.includes("email not confirmed"))
    return "Confirm your email address before signing in. Check your inbox for the confirmation link.";
  if (detail.includes("rate limit") || detail.includes("too many requests"))
    return "Too many attempts. Wait a little while, then try again.";
  if (detail.includes("failed to fetch") || detail.includes("network"))
    return "Could not reach the sign-in service. Check your connection and try again.";
  return "Could not complete this request. Check your details and try again.";
}

export const Route = createFileRoute("/auth")({
  head: () =>
    pageHead(
      "Your learner account",
      "Sign in to save your K53 learner profile and study progress across devices.",
    ),
  component: Auth,
});
export function Auth() {
  const { user, name, refresh, progress } = useStudy();\n  const { language } = useLanguage();\n  const af = language === "af";
  const navigate = useNavigate(),
    router = useRouter(),
    queryClient = useQueryClient();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [display, setDisplay] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const normalizedEmail = email.trim().toLowerCase();
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMessage(af ? "Kyk in jou e-pos vir ’n skakel om jou wagwoord terug te stel." : "Check your email for a password reset link.");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: display } },
        });
        if (error) throw error;
        setMessage(af ? "Kyk in jou e-pos om jou rekening te bevestig voordat jy aanmeld." : "Check your email to confirm your account before signing in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) throw error;
        await router.invalidate();
        await navigate({ to: "/" });
      }
    } catch (error) {
      setMessage(authErrorMessage(error, af));
    } finally {
      setBusy(false);
    }
  }
  async function social(provider: "google" | "lovable") {
    setBusy(true);
    setMessage("");
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) setMessage(af ? "Kon nie met die eksterne diens aanmeld nie. Probeer weer." : result.error.message);
    } catch (error) {
      setMessage(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  if (user)
    return (
      <>
        <div className="page-heading">
          <div>
            <span className="eyebrow">{af ? "LEERDERPROFIEL" : "YOUR LEARNER PROFILE"}</span>
            <h1>Hi, {name}.</h1>
            <p>{af ? "Jou leerderreis, waar jy ook al gaan." : "Your learning journey, wherever you go."}</p>
          </div>
        </div>
        <div className="auth-panel">
          <UserRound size={32} />
          <label>
            Display name
            <Input defaultValue={name} onChange={(e) => setDisplay(e.target.value)} />
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
                setMessage({af ? "Profiel gestoor." : "Profile saved."});
                await refresh();
              } catch (error) {
                console.error("Could not save learner profile", error);
                setMessage({af ? "Kon nie jou profiel stoor nie. Probeer asseblief weer." : "Could not save your profile. Please try again."});
              } finally {
                setBusy(false);
              }
            }}
          >
            Save profile
          </Button>
          <Button variant="outline" onClick={() => void refresh()}>
            <CloudCheck />
            Sync progress
          </Button>
          <p role="status">{message}</p>
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
                setMessage({af ? "Kon nie afmeld nie. Probeer asseblief weer." : "Could not sign out. Please try again."});
              } finally {
                setBusy(false);
              }
            }}
          >
            <LogOut />
            Sign out
          </Button>
        </div>
      </>
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{af ? "NEEM JOU VORDERING SAAM" : "TAKE YOUR PROGRESS WITH YOU"}</span>
          <h1>
            {mode === "signup"
              ? {af ? "Jou reis. Jou rekening." : "Your journey. Your account."}
              : mode === "forgot"
                ? {af ? "Kom ons kry jou weer op die pad." : "Let’s get you back on the road."}
                : {af ? "Welkom by jou leerruimte." : "Welcome to your learning space."}}
          </h1>
          <p>
            Study without an account, or sign in to sync quiz attempts and test results. Lesson
            completion stays on this device; save your profile to sync your name and vehicle.
          </p>
        </div>
      </div>
      <div className="auth-panel">
        {mode !== "forgot" ? (
          <>
            <Button variant="outline" disabled={busy} onClick={() => void social("google")}>
              Continue with Google
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => void social("lovable")}>
              Continue with Lovable
            </Button>
            <div className="auth-divider">{af ? "of met e-pos" : "or with email"}</div>
          </>
        ) : null}
        <form onSubmit={submit}>
          {mode === "signup" ? (
            <label>
              Display name
              <Input
                required
                value={display}
                onChange={(e) => setDisplay(e.target.value)}
                autoComplete="nickname"
              />
            </label>
          ) : null}
          <label>
            Email address
            <Input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          {mode !== "forgot" ? (
            <label>
              Password
              <Input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </label>
          ) : null}
          <Button type="submit" disabled={busy}>
            {busy
              ? {af ? "Wag asseblief…" : "Please wait…"}
              : mode === "signup"
                ? {af ? "Skep rekening" : "Create account"}
                : mode === "forgot"
                  ? {af ? "Stuur terugstelskakel" : "Send reset link"}
                  : {af ? "Meld aan" : "Sign in"}}
            <ArrowRight />
          </Button>
        </form>
        <p role="status">{message}</p>
        <Button
          variant="link"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setMessage("");
          }}
        >
          {mode === "signin"
            ? {af ? "Nuut hier? Skep ’n rekening" : "New here? Create an account"}
            : mode === "forgot"
              ? {af ? "Terug na aanmelding" : "Back to sign in"}
              : "Already have an account? Sign in"}
        </Button>
        {mode === "signin" ? (
          <Button variant="link" onClick={() => setMode("forgot")}>
            Forgot your password?
          </Button>
        ) : null}
      </div>
    </>
  );
}
