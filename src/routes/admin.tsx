import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  FileText,
  LifeBuoy,
  LockKeyhole,
  Settings2,
  ShieldAlert,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAdminAccess } from "@/lib/admin.functions";
import { addLearnerAccess, listLearnerAccess, setLearnerAccessStatus } from "@/lib/learner-access.functions";
import { pageHead } from "@/lib/metadata";
import { useStudy } from "@/components/study-provider";
import { useLanguage } from "@/components/language-provider";
import { supabase } from "@/integrations/supabase/client";

type AdminAccess =
  | { status: "checking" }
  | { status: "ready"; role: "owner" | "admin" }
  | { status: "denied" }
  | { status: "error"; message: string }
  | { status: "unavailable" };

const sections = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "access", label: "Access", icon: Users },
  { id: "learner-access", label: "Learner access", icon: Users },
  { id: "content", label: "Content & resources", icon: BookOpen },
  { id: "settings", label: "Feature settings", icon: Settings2 },
  { id: "legal", label: "Legal documents", icon: FileText },
  { id: "support", label: "Email & tracking", icon: LifeBuoy },
] as const;

type SectionId = (typeof sections)[number]["id"];

function isAdmin(role: unknown): role is "owner" | "admin" {
  return role === "owner" || role === "admin";
}

export const Route = createFileRoute("/admin")({
  head: () =>
    pageHead("Administration", "Manage access, resources and settings for K53 Master SA."),
  component: AdminPage,
});

function AdminPage() {
  const { ready, user } = useStudy();
  const { tr } = useLanguage();
  const userId = user?.id;
  const checkAdminAccess = useServerFn(getAdminAccess);
  const [access, setAccess] = useState<AdminAccess>({ status: "checking" });
  const [section, setSection] = useState<SectionId>("overview");

  useEffect(() => {
    if (!ready) return;
    if (!userId) {
      setAccess({ status: "unavailable" });
      return;
    }

    let active = true;
    void (async () => {
      try {
        const publishableKey = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
        if (!publishableKey?.startsWith("sb_publishable_")) {
          throw new Error("The browser Supabase publishable key is missing from this deployment.");
        }

        // Always take the latest persisted session, not the user snapshot captured
        // by StudyProvider. A tab can remain open while the access token rotates.
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        let session = sessionData.session;
        if (!session) {
          if (active) setAccess({ status: "unavailable" });
          return;
        }

        const verify = (accessToken: string) =>
          checkAdminAccess({ data: { accessToken, publishableKey } });
        let verified;
        try {
          verified = await verify(session.access_token);
        } catch (firstError) {
          const status =
            firstError && typeof firstError === "object" && "status" in firstError &&
            typeof firstError.status === "number" ? firstError.status : undefined;
          // Refresh only on authentication rejection. Do not retry network,
          // configuration, or authorization failures.
          if (status !== 401 && status !== 403) throw firstError;
          const refreshed = await supabase.auth.refreshSession();
          if (refreshed.error) throw refreshed.error;
          session = refreshed.data.session;
          if (!session) throw firstError;
          verified = await verify(session.access_token);
        }

        if (verified.userId !== userId) {
          throw new Error("The verified session does not match the signed-in learner account. Refresh the page and sign in again.");
        }
        if (active) {
          setAccess(isAdmin(verified.role) ? { status: "ready", role: verified.role } : { status: "denied" });
        }
      } catch (error: unknown) {
        console.error("Could not verify admin access", error);
        if (active) {
          const message = error instanceof Error ? error.message : "Unknown admin verification error.";
          setAccess({ status: "error", message });
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [checkAdminAccess, ready, userId]);

  if (access.status === "checking") {
    return (
      <section className="mx-auto max-w-2xl py-10" role="status">
        <h1 className="text-2xl font-semibold">{tr("Checking admin access")}</h1>
        <p className="mt-2 text-muted-foreground">{tr("Verifying your signed-in account permissions…")}</p>
      </section>
    );
  }

  if (access.status !== "ready") {
    return (
      <section className="mx-auto max-w-2xl py-10" aria-labelledby="admin-access-title">
        <div className="flex items-start gap-4 rounded-lg border bg-card p-6">
          <ShieldAlert className="mt-1 shrink-0 text-destructive" aria-hidden="true" />
          <div className="space-y-3">
            <h1 id="admin-access-title" className="text-2xl font-semibold">
              {tr("Admin access")}
            </h1>
            <p className="max-w-prose text-muted-foreground">
              {access.status === "error"
                ? tr("Admin verification failed: ") + access.message
                : access.status === "denied"
                  ? tr("This signed-in account is verified but is not on the administrator allowlist.")
                  : user
                    ? tr("Your session is not available. Sign in again to access administration.")
                    : tr("Sign in with Google to access administration. Only the owner account and accounts granted an admin role can enter.")}
            </p>
            {user ? <p className="text-sm text-muted-foreground">{user.email}</p> : null}
            <Button asChild variant="outline">
              <Link to={user ? "/" : "/auth"}>
                {tr(user ? "Return to your learner dashboard" : "Sign in with Google")}
              </Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const current = sections.find((item) => item.id === section) ?? sections[0];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{tr("App administration")}</h1>
          <p className="mt-2 text-muted-foreground">
            {tr("Manage the app safely. Content, settings and tracking changes remain unavailable until their backends are configured.")}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm text-secondary-foreground">
          <LockKeyhole size={15} aria-hidden="true" />
          {tr(access.role === "owner" ? "Owner" : "Admin")} {tr("access")}
        </span>
      </header>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label={tr("Admin sections")} className="flex gap-2 overflow-x-auto lg:flex-col">
          {sections.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              type="button"
              variant={section === id ? "secondary" : "ghost"}
              className="justify-start whitespace-nowrap"
              aria-current={section === id ? "page" : undefined}
              onClick={() => setSection(id)}
            >
              <Icon size={17} aria-hidden="true" />
              {tr(label)}
            </Button>
          ))}
        </nav>

        <section className="min-w-0 space-y-5" aria-labelledby="admin-section-title">
          <div>
            <h2 id="admin-section-title" className="text-xl font-semibold">
              {tr(current.label)}
            </h2>
          </div>
          {section === "overview" ? <Overview /> : null}
          {section === "access" ? <AccessSection /> : null}
          {section === "learner-access" ? <LearnerAccessSection /> : null}
          {section === "content" ? <ContentSection /> : null}
          {section === "settings" ? <SettingsSection /> : null}
          {section === "legal" ? <LegalSection /> : null}
          {section === "support" ? <SupportSection /> : null}
        </section>
      </div>
    </div>
  );
}

function Status({ children }: { children: string }) {
  const { tr } = useLanguage();
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <span className="size-2 rounded-full bg-amber-500" aria-hidden="true" />
      {tr(children)}
    </span>
  );
}

function SetupRow({
  title,
  description,
  status = "Backend setup required",
}: {
  title: string;
  description: string;
  status?: string;
}) {
  const { tr } = useLanguage();
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b py-4 last:border-b-0">
      <div className="max-w-2xl">
        <h3 className="font-medium">{tr(title)}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{tr(description)}</p>
      </div>
      <Status>{status}</Status>
    </div>
  );
}

function Overview() {
  const { tr } = useLanguage();
  return (
    <>
      <div className="rounded-lg border bg-card px-5">
        <SetupRow
          title="Admin permissions"
          description="The server requires a Google-authenticated session and a verified owner email or trusted admin role."
          status="Server-checked"
        />
        <SetupRow
          title="Resource publishing"
          description="Study content is currently bundled with the app; no admin publishing store is configured."
        />
        <SetupRow
          title="Feature visibility"
          description="The app has no persistent admin-controlled feature settings yet."
        />
        <SetupRow
          title="Legal, support and analytics"
          description="These controls need versioned storage and approved service integrations."
        />
      </div>
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        {tr("Owner access is enabled. Additional administrator grants require the Supabase service-role secret; content publishing, feature settings, legal versions and analytics also need their server-backed storage and policies.")}
      </div>
    </>
  );
}

function AccessSection() {
  const { tr } = useLanguage();
  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-card px-5">
        <SetupRow
          title="Grant administrator access"
          description="Only Google-authenticated administrators can grant roles. This action needs SUPABASE_SERVICE_ROLE_KEY configured as a server secret; the key is never sent to the browser."
          status="Server secret required"
        />
        <SetupRow
          title="Google account sign-in"
          description="The primary owner and granted admins must sign in with their approved Google accounts."
          status="Available"
        />
        <SetupRow
          title="Account requirement"
          description="Additional administrators need an existing Google-backed learner account before they can be granted access."
          status="Existing account"
        />
      </div>
      <p className="max-w-xl rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        {tr("Additional administrator grants are disabled until the Supabase service-role key is configured as a Cloudflare Worker secret. The primary owner account remains available through the verified owner allowlist.")}
      </p>
    </div>
  );
}

function ContentSection() {
  const { tr } = useLanguage();
  return (
    <>
      <div className="rounded-lg border bg-card px-5">
        <SetupRow
          title="Road-sign library"
          description="401 master entries are currently compiled from static app data."
          status="Bundled with app"
        />
        <SetupRow
          title="Guides and study references"
          description="Published guides and question content are shipped with the application."
          status="Bundled with app"
        />
        <SetupRow
          title="Upload, preview and publish"
          description="Uploads and visibility switches require a configured storage bucket, resource metadata, and server-enforced publication rules."
        />
      </div>
      <p className="text-sm text-muted-foreground">
        {tr("Editing bundled content still requires a reviewed code change and deployment; this panel will not pretend a local toggle changed what learners see.")}
      </p>
    </>
  );
}

function SettingsSection() {
  return (
    <div className="rounded-lg border bg-card px-5">
      <SetupRow
        title="Feature visibility"
        description="There is no persistent feature-flag store. Hiding a link alone would not protect a route or change server behavior."
      />
      <SetupRow
        title="Maintenance notice"
        description="A site-wide notice needs a server-backed setting so it is consistent across devices and deployments."
      />
      <SetupRow
        title="Edit application behavior"
        description="Executable functions remain code-reviewed and deployed; this panel is for controlled settings, not code editing."
        status="Code deployment"
      />
    </div>
  );
}

function LegalSection() {
  const { tr } = useLanguage();
  return (
    <div className="rounded-lg border bg-card px-5">
      <SetupRow
        title="About & Legal"
        description="The current document is maintained in the application source."
        status="Source managed"
      />
      <SetupRow
        title="Version history and effective dates"
        description="Publishing dated versions and recording acknowledgements requires persistent legal-document storage."
      />
      <SetupRow
        title="Publisher contact details"
        description="The support email and CIPC number remain placeholders until verified details are supplied."
      />
      <Button asChild variant="outline" className="mb-5">
        <Link to="/about">
          {tr("View current legal page")}
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}

function SupportSection() {
  return (
    <div className="rounded-lg border bg-card px-5">
      <SetupRow
        title="Email replies"
        description="There is no connected support inbox or email delivery provider in the app."
      />
      <SetupRow
        title="Usage tracking"
        description="No admin analytics dashboard is configured. Tracking should be minimized and documented before collection begins."
      />
      <SetupRow
        title="Admin audit trail"
        description="A durable, append-only record of permission, publishing and settings changes needs a protected database table."
      />
    </div>
  );
}


type LearnerAccessRow = {
  id: string;
  email: string;
  user_id: string | null;
  status: "active" | "disabled";
  created_at: string;
};

function LearnerAccessSection() {
  const { tr } = useLanguage();
  const add = useServerFn(addLearnerAccess);
  const list = useServerFn(listLearnerAccess);
  const setStatus = useServerFn(setLearnerAccessStatus);
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<LearnerAccessRow[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload(term = search) {
    const result = await list({ data: { search: term } });
    setRows(result as LearnerAccessRow[]);
  }

  useEffect(() => {
    let active = true;
    void list({ data: { search: "" } }).then((result) => {
      if (active) setRows(result as LearnerAccessRow[]);
    }).catch((error: unknown) => {
      console.error("Could not load learner authorisations", error);
      if (active) setMessage(tr("Could not load learner authorisations."));
    });
    return () => { active = false; };
  }, [list, tr]);

  async function addEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    let result: Awaited<ReturnType<typeof add>>;
    try {
      result = await add({ data: { email } });
    } catch (error) {
      console.error("Could not add learner authorisation", error);
      setMessage(tr("Could not authorise this email. Check the address and try again."));
      setBusy(false);
      return;
    }

    const status = result?.result_status;
    setMessage(status === "created"
      ? tr("Email authorised.")
      : status === "already_active"
        ? tr("This email is already authorised.")
        : status === "disabled_exists"
          ? tr("This email is disabled. Use Restore to reactivate it.")
          : tr("The authorisation request returned an unexpected result."));
    setEmail("");

    try {
      await reload();
    } catch (error) {
      console.error("Email authorisation succeeded, but learner list refresh failed", error);
      setMessage(tr("Email authorisation was saved, but the list could not refresh. Use Search to reload it."));
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(row: LearnerAccessRow, status: "active" | "disabled") {
    if (status === "disabled" && !window.confirm(tr("Disable learning access for this email?"))) return;
    setBusy(true);
    setMessage("");
    try {
      await setStatus({ data: { id: row.id, status } });
      setMessage(status === "disabled" ? tr("Learner access disabled.") : tr("Learner access restored."));
      await reload();
    } catch (error) {
      console.error("Could not change learner access", error);
      setMessage(tr("Could not update learner access."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={(event) => void addEmail(event)} className="flex flex-wrap gap-2 rounded-lg border bg-card p-4">
        <label className="min-w-[220px] flex-1">
          <span className="mb-1 block text-sm font-medium">{tr("Learner email")}</span>
          <input type="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-md border bg-background px-3 py-2" placeholder="learner@example.com" />
        </label>
        <Button type="submit" disabled={busy || !email.trim()} className="self-end">{tr("Authorise email")}</Button>
      </form>
      <div className="flex flex-wrap gap-2">
        <input aria-label={tr("Search learner emails")} value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-[220px] flex-1 rounded-md border bg-background px-3 py-2" placeholder={tr("Search email")} />
        <Button type="button" variant="outline" disabled={busy} onClick={() => void reload()}>{tr("Search")}</Button>
      </div>
      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{message}</p>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50">
            <tr><th className="p-3">{tr("Email")}</th><th className="p-3">{tr("Registration")}</th><th className="p-3">{tr("Access")}</th><th className="p-3">{tr("Action")}</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-3">{row.email}</td>
                <td className="p-3">{row.user_id ? tr("Linked") : tr("Awaiting first sign-in")}</td>
                <td className="p-3">{row.status === "active" ? tr("Active") : tr("Disabled")}</td>
                <td className="p-3">
                  <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void changeStatus(row, row.status === "active" ? "disabled" : "active")}>
                    {tr(row.status === "active" ? "Disable" : "Restore")}
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td className="p-4 text-muted-foreground" colSpan={4}>{tr("No learner authorisations found.")}</td></tr> : null}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{tr("Disabling access preserves the authorisation record and its account link. There is no permanent delete action.")}</p>
    </div>
  );
}
