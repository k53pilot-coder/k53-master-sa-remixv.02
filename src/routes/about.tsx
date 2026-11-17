import { createFileRoute } from "@tanstack/react-router";
import text from "@/content/about-legal.md?raw";
import textAfrikaans from "@/content/about-legal.af.md?raw";
import { useLanguage } from "@/components/language-provider";
import { MiniMarkdown } from "@/lib/mini-markdown";
import { pageHead } from "@/lib/metadata";
export const Route = createFileRoute("/about")({
  head: () =>
    pageHead(
      "About & legal",
      "Who makes K53 Master SA, government affiliation disclaimer, terms of use and privacy information.",
    ),
  component: About,
});
function About() {
  const { language } = useLanguage();
  const { language } = useLanguage();
  return (
    <article className="legal-page">
      <MiniMarkdown source={language === "af" ? textAfrikaans : text} />
    </article>
  );
}
