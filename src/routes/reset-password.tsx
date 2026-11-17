import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/metadata";
import { useLanguage } from "@/components/language-provider";
export const Route = createFileRoute("/reset-password")({
  head: () =>
    pageHead("Reset your password", "Choose a new password for your K53 learner account."),
  component: Reset,
});
function Reset() {
  const { language } = useLanguage();
  const af = language === "af";
  const [recovery, setRecovery] = useState(false),
    [password, setPassword] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setRecovery(new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery");
  }, []);
  return (
    <>
      <div className="page-heading">
        <h1>{af ? "Kies ’n nuwe wagwoord." : "Choose a new password."}</h1>
      </div>
      <form
        className="auth-panel"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            setMessage(af ? "Wagwoord opgedateer. Jy kan met jou nuwe wagwoord aanmeld." : "Password updated. You can sign in with your new password.");
          } catch (error) {
            setMessage(error instanceof Error ? error.message : af ? "Kon nie jou wagwoord opdateer nie." : "Could not update your password.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {recovery ? (
          <>
            <label>
              {af ? "Nuwe wagwoord" : "New password"}
              <Input
                type="password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <Button disabled={busy}>{af ? "Dateer wagwoord op" : "Update password"}</Button>
          </>
        ) : (
          <p>{af ? "Maak die skakel om jou wagwoord terug te stel in jou e-pos oop om voort te gaan." : "Open the password reset link from your email to continue."}</p>
        )}
        <p role="status">{message}</p>
        <Button asChild variant="link">
          <Link to="/auth">{af ? "Terug na aanmelding" : "Back to sign in"}</Link>
        </Button>
      </form>
    </>
  );
}
