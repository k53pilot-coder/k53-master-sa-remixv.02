import { describe, expect, it } from "vitest";
import { isCacheableNavigation, offlineNavigationFallback } from "@/lib/offline-navigation";

describe("offline navigation handling", () => {
  it.each(["/admin", "/admin/", "/admin/access", "/auth", "/auth/callback", "/reset-password", "/~oauth/callback"])(
    "does not intercept live-only route %s",
    (pathname) => {
      expect(isCacheableNavigation({ request: { mode: "navigate" }, url: { pathname } })).toBe(false);
    },
  );

  it("keeps public informational routes eligible for offline caching", () => {
    expect(isCacheableNavigation({ request: { mode: "navigate" }, url: { pathname: "/about" } })).toBe(true);
  });

  it("does not treat asset or data requests as navigation requests", () => {
    expect(isCacheableNavigation({ request: { mode: "cors" }, url: { pathname: "/practice" } })).toBe(false);
  });

  it("marks the synthetic offline response as unavailable and non-cacheable", async () => {
    const response = await offlineNavigationFallback();
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

});
