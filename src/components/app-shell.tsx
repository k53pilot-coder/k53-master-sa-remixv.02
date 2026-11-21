import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpen, LayoutDashboard, Signpost, ClipboardCheck, Car, MapPin,
  ChevronRight, ArrowUpRight, WifiOff, CloudCheck, RotateCcw,
  GraduationCap, Info, Settings2, Languages,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudy } from "./study-provider";
import { useLanguage } from "./language-provider";
import type { ReactNode } from "react";
import { mayRequestAdminAccess } from "@/lib/admin-role";
import { getLearnerAccessStatus } from "@/lib/learner-access.functions";

export function AppShell({ children }: { children: ReactNode }) {
  const path = useLocation().pathname;
  const { user, ready, loadError, cloudError, storageError, online, syncState, retry, name } = useStudy();
  const { language, setLanguage, t, tr } = useLanguage();
  const checkLearnerAccess = useServerFn(getLearnerAccessStatus);
  const [learnerStatus, setLearnerStatus] = useState<"checking" | "active" | "pending" | "disabled" | "unverified" | "google_required" | "signed-out" | "error">("checking");
  const publicRoute = path === "/about" || path === "/auth" || path === "/admin" || path.startsWith("/reset-password");
  useEffect(() => {
    if (publicRoute) return;
    if (!ready) {
      setLearnerStatus("checking");
      return;
    }
    if (!user) {
      setLearnerStatus("signed-out");
      return;
    }

    let current = true;
    const verifyAccess = async () => {
      try {
        const result = await checkLearnerAccess();
        if (current) setLearnerStatus(result.status);
      } catch (error: unknown) {
        console.error("Could not verify learner access", error);
        // Fail closed during service outages: an existing page is not left
        // visible on the strength of a stale successful access check.
        if (current) setLearnerStatus("error");
      }
    };

    void verifyAccess();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void verifyAccess();
    }, 30_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void verifyAccess();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      current = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [checkLearnerAccess, publicRoute, ready, user?.id]);
  const nav = [
    { to: "/", key: "nav.learning" as const, icon: LayoutDashboard },
    { to: "/learn", key: "nav.categories" as const, icon: BookOpen },
    { to: "/signs", key: "nav.signs" as const, icon: Signpost },
    { to: "/practice", key: "nav.practice" as const, icon: ClipboardCheck },
    { to: "/mock-test", key: "nav.mock" as const, icon: GraduationCap },
    { to: "/review", key: "nav.review" as const, icon: RotateCcw },
  ];
  const extra = [
    { to: "/practical", key: "nav.practical" as const, icon: Car },
    { to: "/dltc", key: "nav.resources" as const, icon: MapPin },
    { to: "/about", key: "nav.about" as const, icon: Info },
  ];
  const currentLabel = nav.find((n) => n.to === path);
  const extraLabel = extra.find((n) => n.to === path);
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Link to="/" className="brand"><span className="brand-mark"><Signpost size={25} /></span><span>K53<span className="brand-master">MASTER SA</span></span></Link>
        <div className="sidebar-label">{t("nav.space")}</div>
        <nav className="main-nav">
          {(learnerStatus === "active" ? nav : []).map((n) => <Button asChild variant="ghost" key={n.to} className={`nav-link ${path === n.to ? "nav-active" : ""}`}>
            <Link to={n.to} aria-label={t(n.key)} title={t(n.key)}>
              <n.icon size={19} /><span>{t(n.key)}</span>
              {n.to === "/review" && retry.length > 0 ? <span className="nav-count">{retry.length}</span> : null}
            </Link>
          </Button>)}
        </nav>
        <div className="sidebar-label resources-label">{t("nav.road")}</div>
        <nav className="main-nav">
          {extra.filter((n) => n.to === "/about" || learnerStatus === "active").map((n) => <Button asChild variant="ghost" key={n.to} className={`nav-link ${path === n.to ? "nav-active" : ""}`}>
            <Link to={n.to} aria-label={t(n.key)} title={t(n.key)}><n.icon /><span>{t(n.key)}</span></Link>
          </Button>)}
          {mayRequestAdminAccess({ email: user?.email, email_confirmed_at: user?.email_confirmed_at, app_metadata: user?.app_metadata }) ? (
            <Button asChild variant="ghost" className={`nav-link ${path === "/admin" ? "nav-active" : ""}`}>
              <Link to="/admin" aria-label={t("nav.admin")} title={t("nav.admin")}><Settings2 /><span>{t("nav.admin")}</span></Link>
            </Button>
          ) : null}
        </nav>
        <div className="sidebar-bottom">
          <div className="sa-flag" aria-label="South Africa"><i /><i /><i /><i /></div>
          <span>{t("brand.tagline")}</span><small>{t("brand.motto")}</small>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <div className="breadcrumb">{t("breadcrumb")} <ChevronRight size={14} /><strong>{currentLabel ? t(currentLabel.key) : extraLabel ? t(extraLabel.key) : path === "/admin" ? t("nav.admin") : language === "af" ? "Jou rekening" : "Your account"}</strong></div>
          <div className="header-right">
            <label className="language-switch" style={{display:"inline-flex",alignItems:"center",gap:6}}>
              <Languages size={16} /><span className="sr-only">{t("language.label")}</span>
              <select aria-label={t("language.label")} value={language} onChange={(e) => setLanguage(e.target.value as "en" | "af")} style={{border:"1px solid var(--border)",borderRadius:8,padding:"6px 8px",background:"var(--background)",color:"inherit"}}>
                <option value="en">{t("language.english")}</option><option value="af">{t("language.afrikaans")}</option>
              </select>
            </label>
            <span className="connection">
              {online ? <CloudCheck size={16} /> : <WifiOff size={16} />}
              <span>{!ready ? loadError ? (language === "af" ? "Vordering nie beskikbaar nie" : "Progress unavailable") : (language === "af" ? "Laai vordering…" : "Loading progress…") : storageError ? (language === "af" ? "Vordering nie gestoor nie" : "Progress not saved") : !online ? (language === "af" ? "Vanlyn · op toestel gestoor" : "Offline · saved on device") : cloudError ? (language === "af" ? "Wolksinkronisering nie beskikbaar nie" : "Cloud sync unavailable") : tr(syncState)}</span>
            </span>
            <Button asChild variant="ghost" className="account-button"><Link to="/auth">
              <span className="avatar">{user ? name.slice(0, 1).toUpperCase() : "L"}</span>
              <span>{user ? name : t("account.learner")}<small>{user ? t("account.my") : t("account.signin")}</small></span>
              <ArrowUpRight size={15} />
            </Link></Button>
          </div>
        </header>
        <main className="content" aria-busy={!ready && !loadError}>
          {ready ? <>{storageError ? <p className="cloud-warning" role="alert">{tr(storageError)}</p> : null}{cloudError ? <p className="cloud-warning" role="status">{tr(cloudError)}</p> : null}{!publicRoute && learnerStatus !== "active" ? (
            <section className="mx-auto max-w-2xl rounded-lg border bg-card p-6" role={learnerStatus === "checking" ? "status" : "alert"}>
              <h1 className="text-2xl font-semibold">{learnerStatus === "checking" ? tr("Checking learner access") : tr("Learning access required")}</h1>
              <p className="mt-2 text-muted-foreground">{learnerStatus === "signed-out"
                ? tr("Sign in with your pre-authorised Google email address to access K53 learning features.")
                : learnerStatus === "disabled"
                  ? tr("Your learner access is currently disabled. Contact the administrator.")
                  : learnerStatus === "unverified"
                    ? tr("Verify your Google email address before accessing learning features.")
                    : learnerStatus === "google_required"
                      ? tr("Sign in with Google to access learning features.")
                    : learnerStatus === "pending"
                      ? tr("This email has not been authorised yet. Contact the administrator.")
                      : learnerStatus === "error"
                        ? tr("Learner access could not be verified. Check your connection and try again.")
                        : tr("Please wait while access is checked.")}</p>
              <div className="mt-4 flex gap-2">
                {!user ? <Button asChild><Link to="/auth">{tr("Sign in with Google")}</Link></Button> : null}
                {learnerStatus === "error" ? <Button variant="outline" onClick={() => window.location.reload()}>{tr("Try again")}</Button> : null}
              </div>
            </section>
          ) : publicRoute || learnerStatus === "active" ? children : null}</> :
            <section className="study-loading" role={loadError ? "alert" : "status"}>
              <div className="daily-icon">{loadError ? <RotateCcw /> : <BookOpen />}</div>
              <h1>{tr(loadError ? "Your progress is unavailable" : "Opening your study space")}</h1>
              <p>{loadError ? tr(loadError) : tr("Restoring progress saved on this device…")}</p>
              {loadError ? <Button variant="outline" onClick={() => window.location.reload()}>{tr("Reload app")}</Button> : null}
            </section>}
        </main>
        <footer className="page-footer"><span>K53 Master SA · AI Amplify SA (Pty) Ltd</span><span>Not affiliated with the Department of Transport · <Link to="/about">{t("nav.about")}</Link></span></footer>
      </div>
    </div>
  );
}
