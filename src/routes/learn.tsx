import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/data/categories";
import { AFRIKAANS_CATEGORIES } from "@/data/afrikaans";
import { useLanguage } from "@/components/language-provider";
import { useStudy } from "@/components/study-provider";
import { pageHead } from "@/lib/metadata";
export const Route = createFileRoute("/learn")({
  validateSearch: (s: Record<string, unknown>): { category?: number | undefined } => ({
    category: Number.isInteger(Number(s["category"])) && Number(s["category"]) >= 0 && Number(s["category"]) < 8 ? Number(s["category"]) : undefined,
  }),
  head: () => pageHead("Learn by category", "Eight focused K53 lessons covering road signs, rules, defensive driving and vehicle controls."),
  component: Learn,
});
function Learn() {
  const { category } = Route.useSearch();
  const { progress, learn, setVehicle } = useStudy();
  const { language } = useLanguage();
  const categories = language === "af" ? AFRIKAANS_CATEGORIES : CATEGORIES;
  const words = language === "af"
    ? { all:"Alle kategorieë", category:"KATEGORIE", learn:"LEER", light:"Ligte voertuig", heavy:"Swaar voertuig", motorcycle:"Motorfiets", essentials:"Ken die kernbeginsels", rule:"Verstaan die reël", practice:"Pas dit in die praktyk toe", explored:"Les verken", mark:"Merk les as verken", practise:"Oefen hierdie kategorie", signs:"Verken padtekens", foundation:"BOU JOU GRONDSLAG", heading:"Leer volgens kategorie", intro:"Begin by die kernbeginsels. Bou begrip voordat jy jouself toets.", started:"Nog nie begin nie" }
    : { all:"All categories", category:"CATEGORY", learn:"LEARN", light:"Light vehicle", heavy:"Heavy vehicle", motorcycle:"Motorcycle", essentials:"Know the essentials", rule:"Understand the rule", practice:"Put it into practice", explored:"Lesson explored", mark:"Mark lesson explored", practise:"Practise this category", signs:"Explore road signs", foundation:"BUILD YOUR FOUNDATION", heading:"Learn by category", intro:"Start with the essentials. Build understanding before testing yourself.", started:"Not started" };
  if (category !== undefined) {
    const cat = categories[category];
    if (!cat) return null;
    return <>
      <Button asChild variant="ghost"><Link to="/learn"><ArrowLeft />{words.all}</Link></Button>
      <div className="page-heading"><div><span className="eyebrow">{words.category} {category + 1} · {words.learn}</span><h1>{cat.name}</h1><p>{cat.short}</p></div></div>
      {category === 6 ? <div className="segmented">{(["light","motorcycle","heavy"] as const).map(v => <Button variant={progress.vehicle === v ? "default" : "ghost"} onClick={() => setVehicle(v)} key={v}>{words[v]}</Button>)}</div> : null}
      <div className="lesson-body">{cat.lesson.map((p,i) => <section key={p}><span className="lesson-number">0{i+1}</span><div><h2>{[words.essentials,words.rule,words.practice][i]}</h2><p>{p}</p></div></section>)}</div>
      <div className="lesson-actions"><Button onClick={() => learn(category)} variant="outline"><Check />{progress.learned.includes(category) ? words.explored : words.mark}</Button><Button asChild><Link to="/practice" search={{category}}>{words.practise}<ArrowRight /></Link></Button>{category < 4 ? <Button asChild variant="ghost"><Link to="/signs">{words.signs}<ArrowRight /></Link></Button> : null}</div>
    </>;
  }
  return <><div className="page-heading"><div><span className="eyebrow">{words.foundation}</span><h1>{words.heading}</h1><p>{words.intro}</p></div><BookOpen className="heading-icon" /></div><div className="category-grid wide-grid">{categories.map((cat,i) => <Link to="/learn" search={{category:i}} className={`category-card category-tone-${i%4}`} key={cat.name}><span className="category-number">0{i+1}</span><h3>{cat.name}</h3><p>{cat.description}</p><div className="category-bottom"><span>{progress.learned.includes(i) ? words.explored : words.started}</span><ArrowRight size={18}/></div></Link>)}</div></>;
}
