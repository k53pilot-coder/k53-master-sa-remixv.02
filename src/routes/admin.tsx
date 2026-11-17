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
import { Input } from "@/components/ui/input";
import { getAdminAccess, grantAdminAccess } from "@/lib/admin.functions";
import { ADMIN_OWNER_EMAIL, getAdminRole } from "@/lib/admin-role";
import { pageHead } from "@/lib/metadata";
import { useStudy } from "@/components/study-provider";
import { useLanguage } from "@/components/language-provider";

type AdminAccess =
  { status: "checking" } | { status: "ready"; role: "owner" | "admin" } | { status: "unavailable" };

const sections = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "access", label: "Access", icon: Users },
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
    void checkAdminAccess()
      .then(({ role }) => {
        if (active) {
          setAccess(isAdmin(role) ? { status: "ready", role } : { status: "unavailable" });
        }
      })
      .catch((error: unknown) => {
        console.error("Could not verify admin access", error);
        if (active) setAccess({ status: "unavailable" });
      });

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
              {user
                ? tr("Your Google account does not have administrator access. Ask the owner to grant access to this account.")
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
        {tr("Admin grants are active. Content publishing, feature settings, legal versions and analytics remain unavailable until their server-backed storage and policies are configured.")}
      </div>
    </>
  );
}

function AccessSection() {
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
      <GrantAdminForm />
    </div>
  );
}

function GrantAdminForm() {
  const { tr } = useLanguage();
  const grantAccess = useServerFn(grantAdminAccess);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = await grantAccess({ data: { email: email.trim().toLowerCase() } });
      setMessage(
        result.alreadyAdmin
          ? `${result.email} ${tr("already has administrator access.")}`
          : `${tr("Administrator access granted to")} ${result.email}. ${tr("They can now sign in with Google to use the admin portal.")}`,
      );
      setEmail("");
    } catch (error) {
      console.error("Could not grant administrator access", error);
      setMessage(tr("Could not grant access. Confirm the email belongs to an existing account and try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="max-w-xl space-y-3 rounded-lg border bg-card p-5" onSubmit={submit}>
      <div>
        <h3 className="font-semibold">{tr("Grant admin access")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {tr("Add an existing learner account. The grant is enforced on the server and cannot be changed by the account owner.")}
        </p>
      </div>
      <label className="block space-y-1.5 text-sm font-medium" htmlFor="grant-admin-email">
        {tr("Account email")}
        <Input
          id="grant-admin-email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
          disabled={busy}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <Button type="submit" disabled={busy}>
        {busy ? tr("Granting access…") : tr("Grant administrator access")}
      </Button>
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        {message}
      </p>
    </form>
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
