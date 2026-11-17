import type { SignGroup } from "@/data/signs";

export const AFRIKAANS_CATEGORIES = [
  { name: "Padtekenkategorieë", short: "Die taal van die pad", description: "Verstaan die vorms, kleure en doel van padtekens.", lesson: ["Regulerende tekens gee opdragte wat nagekom moet word. Waarskuwingstekens waarsku jou oor gevare vorentoe. Rigting- en inligtingstekens help jou om jou pad te vind.", "’n Rooi rand dui gewoonlik op ’n beperking of waarskuwing. Blou sirkeltekens gee positiewe opdragte. Tydelike tekens gebruik ’n geel agtergrond.", "Lees die hele teken, insluitend enige bykomende bord. ’n Tyd, voertuigsimbool of afstand kan bepaal wanneer en waar die opdrag geld."] },
  { name: "Regulerende en waarskuwingstekens", short: "Herken. Verstaan. Reageer.", description: "Leer die tekens wat opdragte gee en vir gevare waarsku.", lesson: ["Kom heeltemal tot stilstand by ’n stopteken, agter die stopstreep. By ’n toegeeteken moet jy stadiger ry en voorrang verleen; stop indien nodig.", "’n Spoedgrens is ’n maksimum, nie ’n teiken nie. Ry stadiger wanneer sigbaarheid, weer of verkeer dit vereis.", "Waarskuwingstekens gee jou tyd om op te tree. Verminder vroegtydig jou spoed, kyk vorentoe en laat genoeg ruimte om veilig te stop."] },
  { name: "Padmerke", short: "Lees die pad onder jou", description: "Verstaan lyne, pyle, voetoorgange en geverfde eilande.", lesson: ["Moenie ’n soliede sperstreep oorsteek om verby te steek nie. Gebroke lyne mag slegs oorgesteek word wanneer dit veilig is en ander reëls dit toelaat.", "Stop agter stopstrepe. Hou voetoorgange en kruisings oop. Moet nooit ’n kruising binnegaan as jy nie aan die ander kant kan uitkom nie.", "Rybaanpyle wys die rigting waarin jy moet ry. Geverfde eilande skei verkeer; moenie daarop ry of parkeer nie."] },
  { name: "Verkeersligte en verkeersbeamptes", short: "Weet wanneer om te stop en te ry", description: "Verstaan verkeersligte en die mense wat verkeer beheer.", lesson: ["Rooi beteken stop. Geel beteken stop indien jy dit veilig kan doen. Groen laat jou toe om voort te ry slegs wanneer die kruising oop is.", "By ’n verkeerslig wat buite werking is, behandel die kruising as ’n vierrigting-stop. Moenie aanvaar dat ander bestuurders sal stop nie.", "Volg ’n verkeersbeampte se aanwysings, selfs wanneer dit van ’n lig of teken verskil. Let op die beampte se hande en die verkeer rondom jou."] },
  { name: "Bestuursreëls, veiligheid en voertuigvragte", short: "Neem veiliger besluite", description: "Voorrang, volgafstand, verbysteek en veilige vragte.", lesson: ["Handhaaf ’n veilige volgafstand en vergroot dit in swak toestande. Moet nooit so naby volg dat jy nie kan stop wanneer die voertuig voor jou rem nie.", "Voordat jy verbysteek, kontroleer spieëls, blindekolle en die pad vorentoe. Moenie verbysteek waar sig beperk is of tekens en padmerke dit verbied nie.", "Bevestig vragte stewig en moenie die voertuig se toegelate massa oorskry nie. Vragte mag nie die bestuurder se uitsig, ligte of registrasienommerplate versper nie."] },
  { name: "K53-verdedigende bestuurstelsel en stuurbeheer", short: "Bou vroeg goeie gewoontes", description: "Waarneming, blindekolle, rigtingwysers en beheerde stuurwerk.", lesson: ["Let op verkeer voor en agter jou voordat jy spoed of rigting verander. Kontroleer spieëls en die toepaslike blindekol voordat jy in ’n ander voertuig se pad beweeg.", "Gee betyds ’n aanduiding sonder om ander padgebruikers te mislei. Kontroleer weer voordat jy beweeg: ’n rigtingwyser gee jou nie voorrang nie.", "Stuur glad en behou beheer oor die voertuig. Beplan vroeg sodat skielike rem of abrupte rigtingveranderings onnodig is."] },
  { name: "Voertuigkontroles en lisensiedokumente", short: "Leer jou voertuig ken", description: "Pedale, hefbome, instrumente en die dokumente wat jy benodig.", lesson: ["Weet hoe die versneller, remme, stuurwiel en ratbeheer werk voordat jy bestuur. Kontroles verskil tussen motorfietse, ligte en swaar voertuie.", "Kontroleer spieëls, sitposisie, veiligheidsgordel en instrumente voordat jy ry. Weet waar waarskuwingsligte is en verstaan wanneer jy moet stop.", "Dra die vereiste geldige lisensie en verseker dat die voertuig gelisensieer en padwaardig is. Jou leerlinglisensie het voorwaardes waaraan jy moet voldoen."] },
  { name: "Leerlinglisensiëring, voertuigstandaarde en padveiligheid", short: "Berei voor vir die pad vorentoe", description: "Leerlingvereistes, padwaardigheid en verantwoordelike bestuur.", lesson: ["’n Leerlinglisensie laat jou toe om onder bepaalde voorwaardes te leer; dit is nie ’n volledige bestuurslisensie nie. Kontroleer die reëls vir jou voertuigtipe.", "Reël jou aansoek by die lisensiesentrum. Neem jou identiteitsdokumente, foto’s en die dokumente wat die sentrum vereis. Fooie en afsprake verskil.", "Inspekteer bande, remme, ligte en spieëls gereeld. Moet nooit bestuur wanneer alkohol, dwelms, siekte of moegheid jou onveilig maak nie."] },
] as const;

export const AFRIKAANS_PRACTICAL = {
  title: "Praktiese bestuursgids",
  eyebrow: "VAN TEORIE TOT OP DIE PAD",
  subtitle: "Goeie waarneming. Gladde beheer. Veilige besluite.",
  sections: [
    { name: "Voordat jy beweeg", items: ["Kontroleer rondom en onder die voertuig vir hindernisse en lekkasies.", "Inspekteer bande, wiele, ligte, vensters en spieëls.", "Verstel die sitplek, spieëls en veiligheidsgordel.", "Kontroleer die parkeerrem, ratposisie en instrumente.", "Kyk rondom jou, insluitend blindekolle, voordat jy beweeg."] },
    { name: "Terreinmaneuvers", items: ["Kyk voordat jy enige maneuver of rigtingverandering uitvoer.", "Hou beweging stadig en beheers.", "Oefen parkering sonder om grense of hindernisse te raak.", "Gebruik die parkeerrem korrek op ’n helling.", "Gee duidelik rigting aan en kanselleer daarna die rigtingwyser."] },
    { name: "Op die pad", items: ["Kontroleer spieëls voordat jy stadiger ry of van rigting verander.", "Gee betyds rigting aan en kontroleer die toepaslike blindekol.", "Handhaaf ’n veilige volgafstand.", "Gehoorsaam tekens, padmerke en verkeersseine.", "Beplan vooruit by kruisings, voetoorgange en gevare."] },
  ],
  note: "Gebruik jou amptelike handleiding vir jou spesifieke voertuig en ’n gekwalifiseerde instrukteur vir die volledige assesseringsvereistes.",
  reset: "Herstel kontrolelys",
};

export const AFRIKAANS_SIGN_GROUPS: Partial<Record<SignGroup, { label: string; family: string; blurb: string }>> = {
  control: { label: "Beheertekens", family: "Regulerend", blurb: "Bepaal wie eerste by kruisings beweeg: stop, gee pad, geen toegang en eenrigting." },
  command: { label: "Gebodstekens", family: "Regulerend", blurb: "Blou sirkeltekens wat aandui wat jy MOET doen." },
  prohibition: { label: "Verbodstekens", family: "Regulerend", blurb: "Sirkeltekens met ’n rooi ring wat aandui wat jy NIE MAG doen nie." },
  reservation: { label: "Voorbehoude tekens", family: "Regulerend", blurb: "Reserveer ’n baan, pad of parkeerarea uitsluitlik vir sekere padgebruikers." },
  comprehensive: { label: "Omvattende tekens", family: "Regulerend", blurb: "Dui aan waar spesiale reëls begin of eindig, soos snelweë en stedelike grense." },
  selective: { label: "Selektiewe beperking en opheffing", family: "Regulerend", blurb: "Borde beperk ’n teken tot sekere tye, voertuie of handelinge, of beëindig ’n beperking." },
  "warning-layout": { label: "Waarskuwings oor paduitleg", family: "Waarskuwing", blurb: "Waarsku oor die vorm van die pad of kruising vorentoe." },
  "warning-direction": { label: "Waarskuwings oor bewegingsrigting", family: "Waarskuwing", blurb: "Waarsku oor draaie, baanveranderings en verkeersvloei." },
  "warning-symbolic": { label: "Simboliese waarskuwings", family: "Waarskuwing", blurb: "Waarsku oor gevare soos mense, diere, kruisings en padtoestande." },
  hazard: { label: "Gevaarmerkers", family: "Waarskuwing", blurb: "Skerp-draai- en gestreepte borde merk skerp draaie en hindernisse." },
  information: { label: "Inligtingstekens", family: "Inligting", blurb: "Blou tekens met nuttige inligting vir padgebruikers." },
  guidance: { label: "Rigtingstekens", family: "Rigting", blurb: "Plek-, rigting- en roetenommertekens." },
  tourism: { label: "Toerisme- en dienstetekens", family: "Rigting", blurb: "Bruin toerismeteken en blou dienssimbole." },
  "marking-regulatory": { label: "Regulerende padmerke", family: "Padmerke", blurb: "Geverfde lyne wat jy moet gehoorsaam, soos ’n regulerende teken." },
  "marking-warning": { label: "Waarskuwingspadmerke", family: "Padmerke", blurb: "Geverfde lyne wat waarsku oor wat voorlê." },
  "marking-guidance": { label: "Rigtinggewende padmerke", family: "Padmerke", blurb: "Geverfde lyne wat jou na bane en padrande lei." },
  signal: { label: "Verkeersseine en beamptes", family: "Seine", blurb: "Verkeersligte en seine van verkeersbeamptes." },
  temporary: { label: "Tydelike tekens en padwerke", family: "Tydelik", blurb: "Geel tekens wat by padwerke gebruik word. Dit geniet voorrang bo permanente tekens." },
};

export const AFRIKAANS_SIGN_TERMS: Record<string, string> = {
  "Stop": "Stop", "Yield": "Gee pad", "No entry": "Geen toegang", "One-way roadway": "Eenrigtingpad",
  "Minimum speed": "Minimumspoed", "Keep left": "Hou links", "Keep right": "Hou regs",
  "Proceed left only": "Ry slegs links", "Proceed right only": "Ry slegs regs", "Proceed straight only": "Ry slegs reguit",
  "Turn left ahead": "Draai links vorentoe", "Turn right ahead": "Draai regs vorentoe",
  "Speed limit": "Spoedgrens", "Mass limit": "Massabeperking", "Height limit": "Hoogtebeperking",
  "Length limit": "Lengtebeperking", "Width limit": "Breedtebeperking", "No parking": "Geen parkering",
  "No stopping": "Geen stilhou", "Overtaking prohibited": "Verbysteek verbode", "Pedestrian crossing": "Voetoorgang",
  "Stop line": "Stopstreep", "Yield line": "Gee-pad-streep", "Painted island": "Geverfde verkeerseiland",
  "Lane line": "Baanlyn", "Roadworks": "Padwerke", "Temporary speed limit": "Tydelike spoedgrens",
  "Standard traffic signal": "Standaard verkeerslig", "Pedestrian signal": "Voetgangersein",
  "Traffic officer hand signals": "Handseine van verkeersbeampte",
};

export const AFRIKAANS_SIGN_MEANINGS: Record<string, string> = {
  "Stop completely behind the stop line, then go only when it is safe. Give way to all traffic.": "Kom heeltemal agter die stopstreep tot stilstand en ry eers wanneer dit veilig is. Gee pad aan alle verkeer.",
  "Slow down and give way to traffic on the road you are entering. Stop if needed.": "Verminder spoed en gee pad aan verkeer op die pad wat jy wil binnegaan. Stop indien nodig.",
  "You may not enter this road from this side.": "Jy mag nie hierdie pad van hierdie kant af binnegaan nie.",
  "Traffic may travel only in the direction of the arrow.": "Verkeer mag slegs in die rigting van die pyl beweeg.",
  "You must drive at least the speed shown (unless unsafe).": "Jy moet minstens teen die aangeduide spoed ry, tensy dit onveilig is.",
  "Pass the obstruction on the left side.": "Beweeg links verby die hindernis.",
  "Pass the obstruction on the right side.": "Beweeg regs verby die hindernis.",
  "You may not drive faster than the speed shown in km/h.": "Jy mag nie vinniger as die aangeduide spoed in km/h ry nie.",
  "Vehicles heavier than the mass shown may not proceed.": "Voertuie wat swaarder as die aangeduide massa is, mag nie voortgaan nie.",
  "Do not turn left.": "Moenie links draai nie.",
  "Do not turn right.": "Moenie regs draai nie.",
  "Do not make a U-turn.": "Moenie ’n U-draai maak nie.",
  "Do not overtake where this restriction applies.": "Moenie verbysteek waar hierdie beperking geld nie.",
  "You may not park here. You may stop briefly to load or let passengers in/out.": "Jy mag nie hier parkeer nie. Jy mag kortliks stilhou om vrag te laai of passasiers op of af te laai.",
  "You may not stop at all, not even to pick up or drop off passengers.": "Jy mag glad nie hier stilhou nie, selfs nie om passasiers op of af te laai nie.",
  "A solid line at a stop sign or signal: stop with your front behind it.": "’n Soliede lyn by ’n stopteken of verkeerslig: stop met die voorkant van jou voertuig daaragter.",
  "Do not enter the box unless your exit is clear.": "Moenie die geel blok binnegaan tensy jou uitgang oop is nie.",
  "Shows red, yellow and green indications. Stop on red, prepare to stop on yellow, and proceed on green when safe.": "Wys rooi, geel en groen ligte. Stop by rooi, berei voor om by geel te stop en ry by groen voort wanneer dit veilig is.",
};

export function localizeSignName(value: string, language: "en" | "af") {
  if (language === "en") return value;
  return AFRIKAANS_SIGN_TERMS[value] ?? value;
}
export function localizeSignMeaning(value: string, language: "en" | "af") {
  if (language === "en") return value;
  return AFRIKAANS_SIGN_MEANINGS[value] ?? value;
}
