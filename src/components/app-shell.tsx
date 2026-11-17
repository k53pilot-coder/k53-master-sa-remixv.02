import { Link, useLocation } from "@tanstack/react-router";
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

export function AppShell({ children }: { children: ReactNode }) {
  const path = useLocation().pathname;
  const { user, ready, loadError, cloudError, storageError, online, syncState, retry, name } = useStudy();
  const { language, setLanguage, t } = useLanguage();
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
          {nav.map((n) => <Button asChild variant="ghost" key={n.to} className={`nav-link ${path === n.to ? "nav-active" : ""}`}>
            <Link to={n.to} aria-label={t(n.key)} title={t(n.key)}>
              <n.icon size={19} /><span>{t(n.key)}</span>
              {n.to === "/review" && retry.length > 0 ? <span className="nav-count">{retry.length}</span> : null}
            </Link>
          </Button>)}
        </nav>
        <div className="sidebar-label resources-label">{t("nav.road")}</div>
        <nav className="main-nav">
          {extra.map((n) => <Button asChild variant="ghost" key={n.to} className={`nav-link ${path === n.to ? "nav-active" : ""}`}>
            <Link to={n.to} aria-label={t(n.key)} title={t(n.key)}><n.icon /><span>{t(n.key)}</span></Link>
          </Button>)}
          {mayRequestAdminAccess({ email: user?.email, app_metadata: user?.app_metadata }) ? (
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
          <div className="breadcrumb">{t("breadcrumb")} <ChevronRight size={14} /><strong>{currentLabel ? t(currentLabel.key) : extraLabel ? t(extraLabel.key) : path === "/admin" ? t("nav.admin") : "Your account"}</strong></div>
          <div className="header-right">
            <label className="language-switch" style={{display:"inline-flex",alignItems:"center",gap:6}}>
              <Languages size={16} /><span className="sr-only">{t("language.label")}</span>
              <select aria-label={t("language.label")} value={language} onChange={(e) => setLanguage(e.target.value as "en" | "af")} style={{border:"1px solid var(--border)",borderRadius:8,padding:"6px 8px",background:"var(--background)",color:"inherit"}}>
                <option value="en">{t("language.english")}</option><option value="af">{t("language.afrikaans")}</option>
              </select>
            </label>
            <span className="connection">
              {online ? <CloudCheck size={16} /> : <WifiOff size={16} />}
              <span>{!ready ? loadError ? "Progress unavailable" : "Loading progress…" : storageError ? "Progress not saved" : cloudError ? "Cloud sync unavailable" : online ? syncState : "Offline · saved on device"}</span>
            </span>
            <Button asChild variant="ghost" className="account-button"><Link to="/auth">
              <span className="avatar">{user ? name.slice(0, 1).toUpperCase() : "L"}</span>
              <span>{user ? name : t("account.learner")}<small>{user ? t("account.my") : t("account.signin")}</small></span>
              <ArrowUpRight size={15} />
            </Link></Button>
          </div>
        </header>
        <main className="content" aria-busy={!ready && !loadError}>
          {ready ? <>{storageError ? <p className="cloud-warning" role="alert">{storageError}</p> : null}{cloudError ? <p className="cloud-warning" role="status">{cloudError}</p> : null}{children}</> :
            <section className="study-loading" role={loadError ? "alert" : "status"}>
              <div className="daily-icon">{loadError ? <RotateCcw /> : <BookOpen />}</div>
              <h1>{loadError ? "Your progress is unavailable" : "Opening your study space"}</h1>
              <p>{loadError ?? "Restoring progress saved on this device…"}</p>
              {loadError ? <Button variant="outline" onClick={() => window.location.reload()}>Reload app</Button> : null}
            </section>}
        </main>
        <footer className="page-footer"><span>K53 Master SA · AI Amplify SA (Pty) Ltd</span><span>Not affiliated with the Department of Transport · <Link to="/about">{t("nav.about")}</Link></span></footer>
      </div>
    </div>
  );
}
