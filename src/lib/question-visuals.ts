import { artworkFor } from "@/components/sign-graphic";
import { isLegacyAssetProxyUrl } from "@/lib/sign-artwork-url";
import questionSignMap from "@/data/question-sign-map.json";
import questionVehicleMap from "@/data/question-vehicle-map.json";
import { GROUP_INFO, signByCode } from "@/data/signs";
import type { Question } from "@/lib/quiz";

export type Visual =
  | { kind: "sign"; code: string; label: string }
  | { kind: "image"; url: string; cap: string }
  | { kind: "vehicle"; vehicle: "motorcycle" | "light" | "heavy" };

const CODE_RE = /\(?\b(R|W|GE|IN|TW|TR|RM|RTM|WM|GM|S|GD)\)?\s?(\d+(?:\.\d+)?)\b/g;

/** Official sign codes named in the question text that have verified chart artwork. */
export function signCodesIn(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(CODE_RE)) {
    const code = `${m[1]}${m[2]}`;
    if (artworkFor(code) && !out.includes(code)) out.push(code);
  }
  return out;
}

const packCode = (url: string) => url.match(/k53_sign_([A-Z]+\d+(?:_\d+)?)\.png$/)?.[1]?.replace("_", ".");

/** Signs whose number changes per site; the chart shows one example value. */
const VALUE_VARIES: Record<string, string> = { R201: "chart example shows 100 km/h — the number on the sign is the limit" };

export function labelFor(code: string) {
  const s = signByCode(code);
  const base = s ? `${GROUP_INFO[s.group].family} sign · ${code} · ${s.name}` : `Sign ${code}`;
  return VALUE_VARIES[code] ? `${base} (${VALUE_VARIES[code]})` : base;
}

/** Pictures to show for a question: curated question-to-chart mappings first, then verified text codes.
 *  Retired asset-proxy images and answer-revealing vehicle-control tables are never displayed. */
export function questionVisuals(q: Question): Visual[] {
  const codes = [...new Set([...(questionSignMap[q.id as keyof typeof questionSignMap] ?? []), ...signCodesIn(q.q)])];
  const visuals: Visual[] = [];
  for (const img of q.images ?? []) {
    if (/numbered vehicle controls/i.test(img.cap)) continue;
    const c = packCode(img.url);
    if (c && artworkFor(c)) {
      if (!codes.includes(c)) codes.push(c);
      continue;
    }
    if (!isLegacyAssetProxyUrl(img.url)) visuals.push({ kind: "image", url: img.url, cap: img.cap });
  }
  // Pack sign pictures are rough placeholders: drop them once official chart artwork is shown.
  if (codes.length) return codes.map((code) => ({ kind: "sign" as const, code, label: labelFor(code) }));
  return visuals;
}
