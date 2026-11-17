import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SignGraphic, artworkFor } from "@/components/sign-graphic";
import { SIGNS, GROUP_INFO, SIGN_GROUPS, type SignGroup } from "@/data/signs";
import { AFRIKAANS_SIGN_GROUPS, localizeSignMeaning, localizeSignName } from "@/data/afrikaans";
import { useLanguage } from "@/components/language-provider";
import { pageHead } from "@/lib/metadata";
export const Route = createFileRoute("/signs")({ head:()=>pageHead("Road signs library","Explore South African regulatory, warning, guidance, temporary signs, road markings and signals."), component:Signs });
function Signs() {
 const [search,setSearch]=useState(""),[group,setGroup]=useState("all"),[flash,setFlash]=useState(false),[index,setIndex]=useState(0),[revealed,setRevealed]=useState(false),[expanded,setExpanded]=useState<string|null>(null);
 const {language}=useLanguage(); const af=language==="af";
 const signs=SIGNS.filter(s=>(group==="all"||s.group===group)&&`${s.code} ${s.name} ${s.meaning}`.toLowerCase().includes(search.toLowerCase()));
 const active=signs[index%Math.max(1,signs.length)];
 const label=(g:SignGroup)=>af?(AFRIKAANS_SIGN_GROUPS[g]?.label??GROUP_INFO[g].label):GROUP_INFO[g].label;
 const family=(g:SignGroup)=>af?(AFRIKAANS_SIGN_GROUPS[g]?.family??GROUP_INFO[g].family):GROUP_INFO[g].family;
 const name=(v:string)=>localizeSignName(v,language); const meaning=(v:string)=>localizeSignMeaning(v,language);
 return <><div className="page-heading"><div><span className="eyebrow">{af?"DIE TAAL VAN SUID-AFRIKAANSE PAAIE":"THE LANGUAGE OF SOUTH AFRICAN ROADS"}</span><h1>{af?"Padtekenbiblioteek":"Road signs library"}</h1><p>{SIGNS.length} {af?"meesterinskrywings · regulerende tekens, waarskuwings, rigting, padmerke en seine":"master entries · regulatory, warning, guidance, markings and signals"}</p></div><Button variant="outline" onClick={()=>{setFlash(!flash);setRevealed(false);}}><RotateCcw/>{flash?(af?"Blaai deur biblioteek":"Browse library"):(af?"Flitskaarte":"Flashcards")}</Button></div>
 <div className="sign-toolbar"><div className="search-field"><Search size={18}/><Input aria-label={af?"Soek padtekens":"Search road signs"} value={search} onChange={e=>{setSearch(e.target.value);setIndex(0);}} placeholder={af?"Soek ’n teken, kode of betekenis…":"Search a sign, code or meaning…"}/></div><select aria-label={af?"Tekengroep":"Sign group"} value={group} onChange={e=>{setGroup(e.target.value);setIndex(0);}}><option value="all">{af?"Alle tekengroepe":"All sign groups"}</option>{SIGN_GROUPS.map(g=><option key={g} value={g}>{label(g)}</option>)}</select><span>{signs.length} {af?"tekens":"signs"}</span></div>
 {flash&&active?<div className="flashcard"><span className="eyebrow">{(index%signs.length)+1} / {signs.length} · {active.code}</span><SignGraphic sign={active}/>{revealed?<><h2>{name(active.name)}</h2><p>{meaning(active.meaning)}</p></>:<Button onClick={()=>setRevealed(true)}>{af?"Wys betekenis":"Reveal meaning"}</Button>}<div className="lesson-actions"><Button variant="outline" aria-label={af?"Vorige flitskaart":"Previous flashcard"} onClick={()=>{setIndex(i=>(i+signs.length-1)%signs.length);setRevealed(false);}}><ArrowLeft/></Button><Button aria-label={af?"Volgende flitskaart":"Next flashcard"} onClick={()=>{setIndex(i=>i+1);setRevealed(false);}}><ArrowRight/></Button></div></div>:<div className="sign-grid">{signs.map(s=><article className="sign-card" key={s.code}><div className="sign-card-image"><SignGraphic sign={s}/></div><div className="sign-code">{s.code}<span>{family(s.group as SignGroup)}</span></div><h3>{name(s.name)}</h3><p>{meaning(s.meaning)}</p>{s.variants.length?<><Button variant="link" onClick={()=>setExpanded(expanded===s.code?null:s.code)}>{expanded===s.code?(af?"Versteek":"Hide"):(af?"Wys":"View")} {s.variants.length} {af?"variante":"variants"}</Button>{expanded===s.code?<div className="sign-variants">{s.variants.map(v=>{const code=v.split(" ")[0]??v;return <div key={v}>{artworkFor(code)?<SignGraphic sign={{...s,code}}/>:null}<span>{v}</span></div>;})}</div>:null}</>:null}</article>)}</div>}
 {!signs.length?<div className="empty-state"><h2>{af?"Geen ooreenstemmende tekens nie.":"No matching signs."}</h2><p>{af?"Probeer ’n ander kode of sleutelwoord.":"Try a different code or keyword."}</p></div>:null}</>;
}
