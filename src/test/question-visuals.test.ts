import { describe, expect, it } from "vitest";
import { ALL_QUESTIONS, QUESTIONS, AFRIKAANS_QUESTIONS } from "@/lib/quiz";
import { questionVisuals, signCodesIn } from "@/lib/question-visuals";
import { artworkFor } from "@/components/sign-graphic";
import artwork from "@/data/sign-artwork.json";
import references from "@/data/reference-images.json";
import questionData from "@/data/questions.json";
import questionSignMap from "@/data/question-sign-map.json";
import questionVehicleMap from "@/data/question-vehicle-map.json";
import { filterLegacyAssetProxyUrls, isLegacyAssetProxyUrl, signArtworkUrl } from "@/lib/sign-artwork-url";

describe("question pictures", () => {
  it("every question has at least two options and a valid answer", () => {
    for (const q of ALL_QUESTIONS) {
      expect(q.options.length, q.id).toBeGreaterThanOrEqual(2);
      expect(q.answer, q.id).toBeLessThan(q.options.length);
    }
  });
  it("shows the official artwork for a sign code named in the question", () => {
    for (const q of QUESTIONS) {
      const shown = questionVisuals(q).flatMap((v) => (v.kind === "sign" ? [v.code] : []));
      for (const code of signCodesIn(q.q)) expect(shown, `${q.id} ${code}`).toContain(code);
    }
  });
  it("R1 question shows the stop sign artwork, not a placeholder", () => {
    const q = QUESTIONS.find((x) => /\bR1\b/.test(x.q) && !/R1\./.test(x.q))!;
    expect(questionVisuals(q).some((v) => v.kind === "sign" && v.code === "R1")).toBe(true);
    expect(artworkFor("R1")).toBeTruthy();
  });
  it("uses app-hosted chart images for every sign", () => {
    const urls = new Set(artwork.map((entry) => signArtworkUrl(entry.url)));
    expect(urls).toEqual(
      new Set([
        "/assets/charts/road-sign-sheet-1.webp",
        "/assets/charts/road-sign-sheet-2.webp",
        "/assets/charts/road-sign-sheet-3.webp",
        "/assets/charts/road-sign-sheet-4.webp",
      ]),
    );
  });
  it("never shows the vehicle-control component table that lists the answer", () => {
    for (const q of QUESTIONS.filter((x) => x.vehicle))
      expect(
        questionVisuals(q).some((v) => v.kind === "image" && /numbered vehicle controls/i.test(v.cap)),
        q.id,
      ).toBe(false);
  });
  it("excludes all retired asset-proxy URLs from the PWA precache", () => {
    const precacheUrls = [
      ...artwork.map((entry) => signArtworkUrl(entry.url)),
      ...references.manual,
      ...Object.values(references.vehicle).flat(),
    ];
    const uniqueUrls = [...new Set(precacheUrls)];
    const filteredUrls = filterLegacyAssetProxyUrls(uniqueUrls);
    expect(JSON.stringify(questionData)).not.toContain("/__l5e/assets-v1/");
    expect(filteredUrls.filter(isLegacyAssetProxyUrl)).toHaveLength(0);
    expect(filteredUrls).toEqual(uniqueUrls.filter((url) => !isLegacyAssetProxyUrl(url)));
  });
  it("maps all 33 sign-pack questions to verified official chart artwork in both languages", () => {
    expect(Object.keys(questionSignMap)).toHaveLength(33);
    for (const [id, expectedCodes] of Object.entries(questionSignMap)) {
      const q = ALL_QUESTIONS.find((item) => item.id === id);
      expect(q, id).toBeDefined();
      for (const code of expectedCodes) {
        expect(artworkFor(code), `${id} ${code}`).toBeTruthy();
        expect(
          questionVisuals(q!).some((visual) => visual.kind === "sign" && visual.code === code),
          `${id} ${code}`,
        ).toBe(true);
      }
      const af = AFRIKAANS_QUESTIONS[id];
      if (af) {
        const translated = questionVisuals({ ...q!, q: af.q });
        for (const code of expectedCodes)
          expect(
            translated.some((visual) => visual.kind === "sign" && visual.code === code),
            `${id} Afrikaans ${code}`,
          ).toBe(true);
      }
    }
  });
  it("removes dead legacy image references from all question records", () => {
    expect(JSON.stringify(questionData)).not.toContain("/__l5e/assets-v1/");
  });
  it("never renders a retired image-proxy URL", () => {
    for (const q of QUESTIONS)
      for (const visual of questionVisuals(q))
        if (visual.kind === "image") {
          expect(isLegacyAssetProxyUrl(visual.url), q.id).toBe(false);
          expect(visual.url, q.id).toMatch(/^\/assets\//);
          expect(visual.cap.length, q.id).toBeGreaterThan(0);
        }
  });
});
