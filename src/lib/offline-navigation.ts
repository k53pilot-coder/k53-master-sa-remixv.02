type NavigationMatch = {
  request: { mode: string };
  url: { pathname: string };
};

// These routes require a live request and must never be replaced by a cached
// or synthetic offline page. In particular, /admin must reach the server so
// its current Supabase session can be verified.
const LIVE_ONLY_NAVIGATION = /^\/$|^\/(?:learn|signs|practice|mock-test|review|practical|dltc|auth|admin|reset-password)(?:\/|$)|^\/~oauth(?:\/|$)/;

export function isCacheableNavigation({ request, url }: NavigationMatch) {
  return request.mode === "navigate" && !LIVE_ONLY_NAVIGATION.test(url.pathname);
}

export async function offlineNavigationFallback() {
  return new Response(
    '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>K53 Master SA — Offline</title><main><h1>You’re offline</h1><p>This page was not saved on this device. Reconnect, or open a page you visited while online.</p><p>Your study progress is stored in this browser and will sync when you’re online and signed in.</p><p><a href="/">Try the home page</a></p></main></html>',
    {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}
