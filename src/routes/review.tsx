import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudy } from "@/components/study-provider";
import { QuizPlayer } from "@/components/quiz-player";
import { QUESTIONS, shuffle, type Question } from "@/lib/quiz";
import { useLanguage } from "@/components/language-provider";
import { pageHead } from "@/lib/metadata";
export const Route=createFileRoute("/review")({head:()=>pageHead("Review mistakes","Revisit missed K53 questions and strengthen your weak spots."),component:Review});
function Review(){
 const {retry}=useStudy();const [quiz,setQuiz]=useState<Question[]|null>(null);const {language}=useLanguage();const af=language==="af";
 const pool=QUESTIONS.filter(q=>retry.includes(q.id));
 if(quiz)return <QuizPlayer questions={quiz} onClose={()=>setQuiz(null)}/>;
 return <><div className="page-heading"><div><span className="eyebrow">{af?"JOU HERSIENINGSLYS":"YOUR RETRY PILE"}</span><h1>{af?"Verander foute in bemeestering.":"Turn mistakes into mastery."}</h1><p>{af?`${pool.length} vrae om te hersien. Twee korrekte pogings verwyder elkeen.`:`${pool.length} questions to revisit. Two correct attempts clear each one.`}</p></div></div>
 {pool.length?<><Button onClick={()=>setQuiz(shuffle(pool))}>{af?"Hersien":"Review"} {pool.length} {af?"vrae":"questions"}<ArrowRight/></Button><div className="review-list">{pool.map(q=><div className="answer-review" key={q.id}><span>{q.id}</span><strong>{q.q}</strong></div>)}</div></>:<div className="empty-state"><CheckCircle2 size={44}/><h2>{af?"’n Oop pad vorentoe.":"A clear road ahead."}</h2><p>{af?"Jou verkeerde antwoorde sal hier verskyn nadat jy geoefen het.":"Your missed questions will appear here after practice."}</p><Button asChild><Link to="/practice">{af?"Begin oefen":"Start practising"}<ArrowRight/></Link></Button></div>}</>;
}
