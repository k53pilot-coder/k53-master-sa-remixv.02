import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuizPlayer } from "@/components/quiz-player";
import { useStudy } from "@/components/study-provider";
import { QUESTIONS, shuffle, type Question } from "@/lib/quiz";
import { CATEGORIES } from "@/data/categories";
import { AFRIKAANS_CATEGORIES } from "@/data/afrikaans";
import { useLanguage } from "@/components/language-provider";
import { pageHead } from "@/lib/metadata";
export const Route = createFileRoute("/practice")({
 validateSearch:(s:Record<string,unknown>):{category?:number|undefined}=>({category:Number.isInteger(Number(s["category"]))&&Number(s["category"])>=0&&Number(s["category"])<8?Number(s["category"]):undefined}),
 head:()=>pageHead("Practice questions","Practise K53 questions by category with instant feedback and a personal retry pile."),component:Practice,
});
function Practice(){
 const search=Route.useSearch();const [category,setCategory]=useState(search.category??-1),[count,setCount]=useState(10),[quiz,setQuiz]=useState<Question[]|null>(null);
 const {progress,setVehicle}=useStudy();const {language}=useLanguage();const af=language==="af";
 const cats=af?AFRIKAANS_CATEGORIES:CATEGORIES;
 const pool=QUESTIONS.filter(q=>(category===-1||q.cat===category)&&(!q.vehicle||q.vehicle===progress.vehicle));
 if(quiz)return <QuizPlayer questions={quiz} onClose={()=>setQuiz(null)}/>;
 return <><div className="page-heading"><div><span className="eyebrow">{af?"VERANDER KENNIS IN SELFVERTROUE":"TURN KNOWLEDGE INTO CONFIDENCE"}</span><h1>{af?"Oefenvrae":"Practice questions"}</h1><p>{af?"’n Verkeerde antwoord is ’n kans om te leer. Neem dit een vraag op ’n slag.":"A wrong answer is a chance to learn. Take it one question at a time."}</p></div><Shuffle className="heading-icon"/></div>
 <div className="practice-config"><label>{af?"Kies ’n kategorie":"Choose a category"}<select value={category} onChange={e=>setCategory(Number(e.target.value))}><option value={-1}>{af?"Al agt kategorieë":"All eight categories"}</option>{cats.map((c,i)=><option value={i} key={c.name}>{i+1}. {c.name}</option>)}</select></label>
 {(category===6||category===-1)?<label>{af?"Voertuigkontroles":"Vehicle controls"}<select value={progress.vehicle} onChange={e=>setVehicle(e.target.value as "light"|"heavy"|"motorcycle")}><option value="light">{af?"Ligte voertuig":"Light vehicle"}</option><option value="motorcycle">{af?"Motorfiets":"Motorcycle"}</option><option value="heavy">{af?"Swaar voertuig":"Heavy vehicle"}</option></select></label>:null}
 <label>{af?"Vrae per sessie":"Questions per session"}<select value={count} onChange={e=>setCount(Number(e.target.value))}><option value={10}>10 {af?"vrae":"questions"}</option><option value={20}>20 {af?"vrae":"questions"}</option><option value={50}>50 {af?"vrae":"questions"}</option><option value={999}>{af?"Alle beskikbare vrae":"All available questions"}</option></select></label>
 <p>{pool.length} {af?"vrae beskikbaar · onmiddellike terugvoer":"questions available · immediate feedback"}</p><Button size="lg" disabled={!pool.length} onClick={()=>setQuiz(shuffle(pool).slice(0,count))}>{af?"Begin oefen":"Start practice"}<ArrowRight/></Button></div></>;
}
