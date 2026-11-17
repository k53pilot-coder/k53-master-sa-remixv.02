import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Clock, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudy } from "@/components/study-provider";
import { QuizPlayer } from "@/components/quiz-player";
import { buildMock, SECTION_RULES, type Question } from "@/lib/quiz";
import { useLanguage } from "@/components/language-provider";
import { pageHead } from "@/lib/metadata";
export const Route=createFileRoute("/mock-test")({head:()=>pageHead("Mock test","A three-section K53 mock test with independent targets for rules, signs and vehicle controls."),component:Mock});
function Mock(){
 const {progress,setVehicle}=useStudy();const [quiz,setQuiz]=useState<Question[]|null>(null);const {language}=useLanguage();const af=language==="af";
 const ready=new Set(progress.attempts.map(a=>a.category)).size===8;
 const sectionNames=af?["Padreëls","Tekens, padmerke en seine","Voertuigkontroles"]:SECTION_RULES.map(s=>s.name);
 if(quiz)return <QuizPlayer mock questions={quiz} onClose={()=>setQuiz(null)}/>;
 return <><div className="page-heading"><div><span className="eyebrow">{af?"BRING ALLES BYMEKAAR":"PUT IT ALL TOGETHER"}</span><h1>{af?"Jou volgende kontrolepunt.":"Your next checkpoint."}</h1><p>{af?"Drie afdelings. Slaag in elke afdeling, nie net die algehele totaal nie.":"Three sections. Pass every section, not just the overall total."}</p></div></div>
 <div className="result-sections">{SECTION_RULES.map((s,i)=><div key={s.key}><h3>{sectionNames[i]}</h3><strong>{s.count}<small> {af?"vrae":"questions"}</small></strong><p>{af?"Oefenslaagteiken":"Practice pass target"}: {s.pass} {af?"korrek":"correct"}</p></div>)}</div>
 <div className="practice-config"><label>{af?"Voertuigkontroles":"Vehicle controls"}<select value={progress.vehicle} onChange={e=>setVehicle(e.target.value as "light"|"heavy"|"motorcycle")}><option value="light">{af?"Ligte voertuig":"Light vehicle"}</option><option value="motorcycle">{af?"Motorfiets":"Motorcycle"}</option><option value="heavy">{af?"Swaar voertuig":"Heavy vehicle"}</option></select></label>
 <p><Clock size={16}/> 64 {af?"vrae":"questions"} · 60 {af?"minute-oefentyd":"minute practice timer"} · {af?"antwoorde ná voltooiing":"answers after completion"}</p>
 <small>{af?"Dit is studiedoelwitte vir hierdie proeftoetsformaat. Bevestig die huidige toetsformaat by jou lisensiesentrum voor jou afspraak.":"These are study targets for this mock format. Confirm your licensing centre’s current test format before your appointment."}</small>
 {ready?<Button onClick={()=>setQuiz(buildMock(progress.vehicle))}>{af?"Begin proeftoets":"Start mock test"}<ArrowRight/></Button>:<><p><LockKeyhole size={16}/>{af?"Oefen minstens een vraag in al agt kategorieë om toegang te kry.":"Practise at least one question in all eight categories to unlock."}</p><Button asChild><Link to="/practice">{af?"Gaan voort met oefen":"Continue practice"}<ArrowRight/></Link></Button></>}</div></>;
}
