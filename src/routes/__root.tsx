import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { StudyProvider } from "@/components/study-provider";
import { AppShell } from "@/components/app-shell";
import { LanguageProvider } from "@/components/language-provider";
import { Toaster } from "@/components/ui/sonner";
import { setupOffline } from "@/lib/offline";

function NotFoundComponent() {
  const [afrikaans, setAfrikaans] = useState(false);
  useEffect(() => {
    setAfrikaans(window.localStorage.getItem("k53-language") === "af");
  }, []);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{afrikaans ? "Bladsy nie gevind nie" : "Page not found"}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {afrikaans ? "Die bladsy waarna jy soek, bestaan nie of is verskuif nie." : "The page you're looking for doesn't exist or has been moved."}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {afrikaans ? "Gaan na die tuisblad" : "Go home"}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  const [afrikaans, setAfrikaans] = useState(false);
  useEffect(() => {
    setAfrikaans(window.localStorage.getItem("k53-language") === "af");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {afrikaans ? "Hierdie bladsy kon nie laai nie" : "This page didn't load"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {afrikaans ? "Iets het aan ons kant verkeerd geloop. Probeer weer of gaan terug na die tuisblad." : "Something went wrong on our end. You can try refreshing or head back home."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {afrikaans ? "Probeer weer" : "Try again"}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {afrikaans ? "Gaan na die tuisblad" : "Go home"}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "K53 Master SA" },
      {
        name: "description",
        content:
          "Learn South African road signs, practise the rules and prepare for your K53 learner’s test.",
      },
      { property: "og:title", content: "K53 Master SA" },
      {
        property: "og:description",
        content: "Your road to a confident South African learner’s test.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/icon-192.png", type: "image/png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    void setupOffline();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
      <StudyProvider>
        <AppShell>
          <Outlet />
        </AppShell>
      </StudyProvider>
      </LanguageProvider>
      <Toaster />
    </QueryClientProvider>
  );
}
