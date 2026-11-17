import { describe, expect, it } from "vitest";
import { ALL_QUESTIONS, QUESTIONS } from "@/lib/quiz";
import { questionVisuals, signCodesIn } from "@/lib/question-visuals";
import { artworkFor } from "@/components/sign-graphic";
import artwork from "@/data/sign-artwork.json";
import references from "@/data/reference-images.json";
import questionData from "@/data/questions.json";
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
        questionVisuals(q).some(
          (v) => v.kind === "image" && /numbered vehicle controls/i.test(v.cap),
        ),
        q.id,
      ).toBe(false);
  });
  it("excludes all retired asset-proxy URLs from the PWA precache", () => {
    const precacheUrls = [
      ...artwork.map((entry) => signArtworkUrl(entry.url)),
      ...references.manual,
      ...Object.values(references.vehicle).flat(),
      ...questionData.flatMap((q) => q.images?.map((image) => image.url) ?? []),
    ];
    const uniqueUrls = [...new Set(precacheUrls)];
    const filteredUrls = filterLegacyAssetProxyUrls(uniqueUrls);

    expect(uniqueUrls.filter(isLegacyAssetProxyUrl)).toHaveLength(41);
    expect(filteredUrls.filter(isLegacyAssetProxyUrl)).toHaveLength(0);
    expect(filteredUrls).toHaveLength(uniqueUrls.length - 41);
  });
  it("every non-sign picture has a caption and a hosted address", () => {
    for (const q of QUESTIONS)
      for (const v of questionVisuals(q))
        if (v.kind === "image") {
          expect(v.url, q.id).toMatch(/^\/__l5e\/assets-v1\//);
          expect(v.cap.length, q.id).toBeGreaterThan(0);
        }
  });
});
