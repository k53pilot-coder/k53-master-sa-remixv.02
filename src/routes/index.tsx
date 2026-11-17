import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Check, ClipboardCheck, Signpost, Target, ChevronRight, Route as RouteIcon, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudy } from "@/components/study-provider";
import { CATEGORIES } from "@/data/categories";
import { AFRIKAANS_CATEGORIES } from "@/data/afrikaans";
import { useLanguage } from "@/components/language-provider";
import { QUESTIONS } from "@/lib/quiz";
import { SIGNS } from "@/data/signs";
import { pageHead } from "@/lib/metadata";
import road from "@/assets/study-road.jpg";
export const Route = createFileRoute("/")({ head:()=>pageHead("My learning","Your South African K53 study journey: eight categories, road signs, practice and mock tests."), component:Dashboard });
function Dashboard() {
 const {progress,name}=useStudy(); const {language}=useLanguage(); const af=language==="af";
 const categories=af?AFRIKAANS_CATEGORIES:CATEGORIES;
 const next=categories.findIndex((_,i)=>!progress.learned.includes(i)); const complete=next===-1;
 const answered=new Set(progress.attempts.map(a=>a.question_id)).size;
 const accuracy=progress.attempts.length?Math.round(progress.attempts.filter(a=>a.correct).length/progress.attempts.length*100):0;
 const w=af?{
  eyebrow:"HOU AAN BEWEEG",headline:complete?"Jy het elke kategorie verken.":progress.attempts.length?`Welkom terug, ${name}.`:"Jou pad na gereedheid begin hier.",
  intro:"’n Bietjie leer vandag. Baie meer selfvertroue môre.",journey:"Jou leerderreis",banner:"LEER. OEFEN. SLAAG.",know:"Ken die tekens. Verstaan die reëls.",turn:"Neem die volgende draai met selfvertroue.",all:"Oefen alle kategorieë",continue:"Gaan voort met leer",start:"Begin jou leerreis",
  stats:["Kategorieë verken","Vrae geoefen","Oefenakkuraatheid","Leervordering"],subs:["Bou ’n sterk grondslag",`${QUESTIONS.length} vrae om te verken`,"Elke antwoord is ’n stap vorentoe","Jou eie pas. Jou eie pad."],
  path:"Jou leerpad",pathSub:"Agt kernbeginsels. Een selfversekerde bestuurder.",view:"Bekyk alles",steps:["Leer","Oefen","Hersien","Proeftoets","Gereed"],explored:"Verken",begin:"Begin hier",count:"vrae",progress:"Aan die gang",explore:"Verken",daily:"’n Bietjie elke dag",small:"Klein treë. Volgehoue selfvertroue.",dailyText:"Maak tyd vir ’n paar vrae. Kom môre terug en behou jou momentum.",practice:"Kom ons oefen",read:"LEES DIE PAD",story:"Elke teken vertel ’n storie.",signs:`Verken ${SIGNS.length} padtekeninskrywings en hul betekenisse.`,open:"Maak die tekenbiblioteek oop",mindset:"DIE K53-INSTELLING",quote:"Kyk vorentoe. Dink vooruit. Laat jouself ’n uitweg.",defensive:"Verdedigende bestuur begin by waarneming.",caption:"SUID-AFRIKAANSE PAAIE. JOU VOLGENDE HOOFSTUK."
 }:{
  eyebrow:"LET’S KEEP MOVING",headline:complete?"You’ve explored every category.":progress.attempts.length?`Welcome back, ${name}.`:"Your road to ready starts here.",
  intro:"A little learning today. A lot more confidence tomorrow.",journey:"Your learner’s journey",banner:"LEARN. PRACTISE. PASS.",know:"Know the signs. Understand the rules.",turn:"Take the next turn with confidence.",all:"Practise all categories",continue:"Continue learning",start:"Start your learning journey",
  stats:["Categories explored","Questions practised","Practice accuracy","Learning progress"],subs:["Build a strong foundation",`${QUESTIONS.length} questions to explore`,"Every answer is a step forward","Your own pace. Your own path."],
  path:"Your learning path",pathSub:"Eight essentials. One confident driver.",view:"View all",steps:["Learn","Practise","Review","Mock test","Ready"],explored:"Explored",begin:"Start here",count:"questions",progress:"In progress",explore:"Explore",daily:"A little every day",small:"Small steps. Lasting confidence.",dailyText:"Make time for a few questions. Come back tomorrow and keep your momentum.",practice:"Let’s practise",read:"READ THE ROAD",story:"Every sign has a story.",signs:`Explore ${SIGNS.length} road-sign entries and what they mean.`,open:"Open the sign library",mindset:"THE K53 MINDSET",quote:"Look ahead. Think ahead. Leave yourself a way out.",defensive:"Defensive driving starts with observation.",caption:"SOUTH AFRICAN ROADS. YOUR NEXT CHAPTER."
 };
 return <><div className="page-heading"><div><span className="eyebrow">{w.eyebrow}</span><h1>{w.headline}</h1><p>{w.intro}</p></div><span className="journey-label"><RouteIcon size={16}/>{w.journey}</span></div>
 <section className="road-feature"><img src={road} alt={af?"’n Oop Suid-Afrikaanse pad wat deur groen berge kronkel":"An open South African road winding through green mountains"} width={1408} height={704}/><div className="road-shade"/><div className="road-copy"><span className="feature-label"><span/>{w.banner}</span><h2>K53 Master SA</h2><p>{w.know}<br/>{w.turn}</p><Button asChild size="lg">{complete?<Link to="/practice">{w.all}<ArrowRight/></Link>:<Link to="/learn" search={{category:next}}>{progress.learned.length?w.continue:w.start}<ArrowRight/></Link>}</Button></div><div className="road-caption"><Signpost size={13}/> {w.caption}</div></section>
 <section className="stats-row">{[BookOpen,ClipboardCheck,Target,ShieldCheck].map((Icon,i)=><div className="stat" key={w.stats[i]}><div><span>{w.stats[i]}</span><Icon size={19}/></div><strong>{[String(progress.learned.length)+" / 8",String(answered),progress.attempts.length?`${accuracy}%`:"—",`${Math.round(progress.learned.length/8*100)}%`][i]}</strong><small>{w.subs[i]}</small></div>)}</section>
 <div className="learning-layout"><section className="learning-section"><div className="section-heading"><div><h2>{w.path}</h2><p>{w.pathSub}</p></div><Button asChild variant="ghost"><Link to="/learn">{w.view}<ArrowRight/></Link></Button></div>
 <div className="path-steps">{w.steps.map((s,i)=><span key={s} className={i===0?"step-active":""}><b>{i+1}</b>{s}{i<4?<ChevronRight size={14}/>:null}</span>)}</div>
 <div className="category-grid">{categories.map((cat,i)=>{const learned=progress.learned.includes(i);const attempts=progress.attempts.filter(a=>a.category===i);return <Link to="/learn" search={{category:i}} key={cat.name} className={`category-card category-tone-${i%4}`}><div className="category-top"><span className="category-number">{String(i+1).padStart(2,"0")}</span>{learned?<span className="category-status"><Check size={12}/>{w.explored}</span>:i===next?<span className="category-status next-status">{w.begin}</span>:null}</div><h3>{cat.name}</h3><p>{cat.description}</p><div className="category-bottom"><span>{QUESTIONS.filter(q=>q.cat===i).length} {w.count}</span><span>{attempts.length?w.progress:w.explore}<ArrowRight size={15}/></span></div></Link>;})}</div></section>
 <aside className="study-aside"><div className="section-heading"><h2>{w.daily}</h2></div><div className="daily-note"><h3>{w.small}</h3><p>{w.dailyText}</p><Button asChild><Link to="/practice">{w.practice}<ArrowRight/></Link></Button></div><Link to="/signs" className="signs-preview"><span className="eyebrow">{w.read}</span><h3>{w.story}</h3><p>{w.signs}</p><span className="text-link">{w.open}<ArrowRight size={16}/></span></Link><div className="study-tip"><span>{w.mindset}</span><p>“{w.quote}”</p><small>{w.defensive}</small></div></aside></div></>;
}
