import { describe, it, expect } from "vitest";
import {
  ALL_QUESTIONS,
  QUESTIONS,
  buildMock,
  scoreMock,
  sectionFor,
  retryIds,
  SECTION_RULES,
} from "@/lib/quiz";
import { refusesOffline } from "@/lib/offline";
import { isCacheableNavigation, offlineNavigationFallback } from "@/lib/offline-navigation";
import { CATEGORIES } from "@/data/categories";
describe("K53 learning rules", () => {
  it("categorizes every imported question into one of eight categories", () => {
    expect(CATEGORIES).toHaveLength(8);
    for (const q of ALL_QUESTIONS) expect(q.cat).toBeGreaterThanOrEqual(0);
    expect(ALL_QUESTIONS.every((q) => q.cat < 8)).toBe(true);
  });
  it("withholds every question marked for source review", () => {
    expect(ALL_QUESTIONS.filter((q) => q.review).length).toBe(12);
    expect(QUESTIONS.some((q) => q.review)).toBe(false);
  });
  it.each(["light", "motorcycle", "heavy"] as const)(
    "builds an unrepeated 28/28/8 mock for %s",
    (vehicle) => {
      const q = buildMock(vehicle);
      expect(q).toHaveLength(64);
      expect(new Set(q.map((q) => q.id)).size).toBe(64);
      expect(SECTION_RULES.map((s) => q.filter((q) => sectionFor(q) === s.key).length)).toEqual([
        28, 28, 8,
      ]);
      expect(q.filter((q) => q.vehicle).every((q) => q.vehicle === vehicle)).toBe(true);
    },
  );
  it("requires each independent section target, not an overall pass total", () => {
    const qs = buildMock("light");
    const answers: Record<string, number> = {};
    for (const s of SECTION_RULES) {
      const subset = qs.filter((q) => sectionFor(q) === s.key);
      subset.forEach((q, i) => {
        if (i < s.pass) answers[q.id] = q.answer;
      });
    }
    expect(scoreMock(qs, answers).passed).toBe(true);
    const control = qs.find((q) => sectionFor(q) === "controls");
    if (!control) throw new Error("Missing controls");
    delete answers[control.id];
    expect(scoreMock(qs, answers).passed).toBe(false);
    expect(SECTION_RULES.map((s) => s.pass)).toEqual([22, 23, 6]);
  });
  it("clears a retry question only after two correct attempts since its last mistake", () => {
    const attempts = [
      { question_id: "K53-001", correct: false },
      { question_id: "K53-001", correct: true },
    ];
    expect(retryIds(attempts)).toEqual(["K53-001"]);
    expect(retryIds([...attempts, { question_id: "K53-001", correct: true }])).toEqual([]);
  });
  it("never registers offline caching in development, embedded, or explicitly disabled sessions", () => {
    expect(refusesOffline(true, false, false)).toBe(true);
    expect(refusesOffline(false, false, false)).toBe(false);
    expect(refusesOffline(false, true, false)).toBe(true);
    expect(refusesOffline(false, false, true)).toBe(true);
  });
  it("uses an explicit fallback for uncached pages but never caches auth navigations", async () => {
    const navigation = (pathname: string) => ({
      request: { mode: "navigate" },
      url: { pathname },
    });
    expect(isCacheableNavigation(navigation("/practice"))).toBe(true);
    expect(isCacheableNavigation(navigation("/auth"))).toBe(false);
    expect(isCacheableNavigation(navigation("/~oauth/callback"))).toBe(false);
    expect(isCacheableNavigation(navigation("/reset-password"))).toBe(false);
    expect(
      isCacheableNavigation({ request: { mode: "cors" }, url: { pathname: "/practice" } }),
    ).toBe(false);

    const response = await offlineNavigationFallback();
    expect(response.headers.get("Content-Type")).toContain("text/html");
    expect(await response.text()).toContain("You’re offline");
  });
});
