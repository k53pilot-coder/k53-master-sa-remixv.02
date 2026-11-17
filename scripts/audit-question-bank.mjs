import { readFileSync, writeFileSync } from "node:fs";

const input = new URL("../src/data/questions.json", import.meta.url);
const output = process.argv[2];
const questions = JSON.parse(readFileSync(input, "utf8"));
const ids = new Set();
const textByVehicle = new Map();
const categories = {};
const issues = [];

for (const [index, q] of questions.entries()) {
  const label = q.id ?? `row ${index + 1}`;
  if (!q.id || ids.has(q.id)) issues.push({ id: label, issue: "missing or duplicate id" });
  ids.add(q.id);
  if (typeof q.q !== "string" || !q.q.trim()) issues.push({ id: label, issue: "missing question text" });
  if (!Array.isArray(q.options) || q.options.length < 2) issues.push({ id: label, issue: "missing/short options" });
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= (q.options?.length ?? 0)) {
    issues.push({ id: label, issue: "answer index outside options" });
  }
  if (!Number.isInteger(q.cat) || q.cat < 0 || q.cat > 7) issues.push({ id: label, issue: "category outside 0..7" });
  const category = String(q.cat ?? "unknown");
  categories[category] ??= { total: 0, missingExplanation: 0 };
  categories[category].total++;
  if (!(typeof q.explain === "string" && q.explain.trim()) && !(typeof q.note === "string" && q.note.trim())) {
    categories[category].missingExplanation++;
    issues.push({ id: label, issue: "missing explanation/note", severity: "content-review" });
  }
  const key = `${q.vehicle ?? "general"}::${q.q?.trim().toLowerCase()}`;
  textByVehicle.set(key, (textByVehicle.get(key) ?? 0) + 1);
}
const report = {
  generatedAt: new Date().toISOString(),
  totalQuestions: questions.length,
  uniqueIds: ids.size,
  categories,
  duplicateQuestionTextWithinVehicle: [...textByVehicle].filter(([, count]) => count > 1).map(([question]) => question),
  issues,
  summary: {
    structuralErrors: issues.filter((x) => x.severity !== "content-review").length,
    missingExplanations: issues.filter((x) => x.issue === "missing explanation/note").length,
  },
};
const json = JSON.stringify(report, null, 2) + "\n";
if (output) writeFileSync(output, json);
else process.stdout.write(json);
if (report.summary.structuralErrors > 0) process.exitCode = 1;
