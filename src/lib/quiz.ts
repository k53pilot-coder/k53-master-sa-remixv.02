import raw from "@/data/questions.json";
import rawAfrikaans from "@/data/questions.af.json";
export type Vehicle = "light" | "heavy" | "motorcycle";
export interface Question {
  id: string;
  q: string;
  options: string[];
  answer: number;
  cat: number;
  vehicle?: string;
  images?: { url: string; cap: string }[];
  review?: string;
  explain?: string | null;
  note?: string;
  src: string;
}
export const ALL_QUESTIONS: Question[] = raw;
export type AfrikaansQuestion = { q: string; options: string[]; explain?: string | null; note?: string };
export const AFRIKAANS_QUESTIONS = rawAfrikaans as Record<string, AfrikaansQuestion>;
export const QUESTIONS = ALL_QUESTIONS.filter((q) => !q.review);
export const SECTION_RULES = [
  { key: "rules", name: "Rules of the road", count: 28, pass: 22 },
  { key: "signs", name: "Signs, markings & signals", count: 28, pass: 23 },
  { key: "controls", name: "Vehicle controls", count: 8, pass: 6 },
] as const;
export function sectionFor(q: Question) {
  return q.vehicle ? "controls" : q.cat <= 3 ? "signs" : "rules";
}
export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const left = a[i],
      right = a[j];
    if (left !== undefined && right !== undefined) {
      a[i] = right;
      a[j] = left;
    }
  }
  return a;
}
export function buildMock(vehicle: Vehicle): Question[] {
  return SECTION_RULES.flatMap((s) => {
    const pool = QUESTIONS.filter(
      (q) => sectionFor(q) === s.key && (!q.vehicle || q.vehicle === vehicle),
    );
    if (pool.length < s.count) throw new Error(`Not enough ${s.name} questions`);
    return shuffle(pool).slice(0, s.count);
  });
}
export function scoreMock(questions: Question[], answers: Record<string, number>) {
  const sections = SECTION_RULES.map((s) => {
    const qs = questions.filter((q) => sectionFor(q) === s.key);
    const correct = qs.filter((q) => answers[q.id] === q.answer).length;
    return { ...s, total: qs.length, correct, passed: qs.length === s.count && correct >= s.pass };
  });
  return { sections, passed: sections.every((s) => s.passed) };
}
export function retryIds(attempts: { question_id: string; correct: boolean }[]) {
  const state: Record<string, number> = {};
  for (const a of attempts) {
    if (!a.correct) state[a.question_id] = 0;
    else if (a.question_id in state) state[a.question_id] = (state[a.question_id] ?? 0) + 1;
  }
  return Object.keys(state).filter((id) => (state[id] ?? 0) < 2);
}
