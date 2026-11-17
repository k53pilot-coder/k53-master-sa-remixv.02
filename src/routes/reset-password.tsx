import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/metadata";
import { useLanguage } from "@/components/language-provider";
export const Route = createFileRoute("/reset-password")({
  head: () => pageHead("Google sign-in","K53 Master SA accounts use Google sign-in."),
  component: GoogleAccountHelp,
});
function GoogleAccountHelp() {
  const {language,tr}=useLanguage();
  const af=language==="af";
  return <div className="mx-auto max-w-xl space-y-4 py-10">
    <div className="page-heading">
      <h1>{af?"Gebruik jou Google-rekening":"Use your Google account"}</h1>
      <p>{af?"K53 Master SA gebruik Google-aanmelding. Bestuur jou wagwoord en rekeningherstel direk in jou Google-rekening.":"K53 Master SA uses Google sign-in. Manage your password and account recovery directly in your Google Account."}</p>
    </div>
    <Button asChild><Link to="/auth">{tr("Continue with Google")}</Link></Button>
  </div>;
}
