import { createFileRoute } from "@tanstack/react-router";
import { MapPin, FileText, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/metadata";
import documents from "@/data/documents.json";
import { useLanguage } from "@/components/language-provider";
export const Route=createFileRoute("/dltc")({head:()=>pageHead("DLTC and resources","Prepare your licensing centre appointment and read the supplied K53 reference manuals."),component:DLTC});
function DLTC(){
 const {language}=useLanguage();const af=language==="af";
 const sections=af?[
 ["Reël jou afspraak","Kontak jou plaaslike lisensiesentrum of jou provinsie se amptelike besprekingdiens. Bevestig die huidige fooie, afspraakproses en aanvaarde dokumente."],
 ["Berei jou dokumente voor","Neem geldige identifikasie, die vereiste foto’s en bewys van adres indien dit vereis word. Bevestig die vereistes by jou sentrum voordat jy reis."],
 ["Kom voorbereid aan","Laat genoeg tyd toe vir die oogtoets en administrasie. Bevestig die toetstaal, voertuigtipe en toetsformaat. Lees elke vraag sorgvuldig."]
 ]:[
 ["Arrange your appointment","Contact your local licensing centre or your province’s official booking service. Confirm the current fees, appointment process and accepted documents."],
 ["Prepare your documents","Take valid identification, the required photographs and proof of address where requested. Confirm the requirements with your centre before travelling."],
 ["Arrive ready","Allow time for the eye test and administration. Confirm the test language, vehicle type and test format. Read each question carefully."]
 ];
 return <><div className="page-heading"><div><span className="eyebrow">{af?"BEREI VOOR VIR TOETSDAG":"PREPARE FOR TEST DAY"}</span><h1>{af?"DLTC en hulpbronne":"DLTC & resources"}</h1><p>{af?"Jou volgende stap begin by ’n bestuurslisensietoetssentrum.":"Your next step starts at a driving licence testing centre."}</p></div><MapPin className="heading-icon"/></div>
 <div className="lesson-body">{sections.map(([h,p],i)=><section key={h}><span className="lesson-number">0{i+1}</span><div><h2>{h}</h2><p>{p}</p></div></section>)}</div>
 <div className="section-heading"><div><h2>{af?"Jou naslaanrak":"Your reference shelf"}</h2><p>{af?"Voorsiene handleidings en kaarte · PDF’s vereis ’n internetverbinding tensy dit reeds afgelaai is.":"Supplied manuals and charts · PDFs need a connection unless already downloaded."}</p></div></div>
 <div className="document-list">{documents.map(d=><div key={d.name}><FileText size={22}/><div><h3>{d.name}</h3><small>{d.description}</small></div><Button asChild variant="outline" size="icon"><a href={d.url} target="_blank" rel="noreferrer" aria-label={af?`Maak ${d.name} oop`:`Open ${d.name}`}><ArrowUpRight/></a></Button></div>)}</div></>;
}
