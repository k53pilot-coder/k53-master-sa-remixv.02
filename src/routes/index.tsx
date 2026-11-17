import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  ClipboardCheck,
  Signpost,
  Target,
  TrendingUp,
  ChevronRight,
  Route as RouteIcon,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudy } from "@/components/study-provider";
import { CATEGORIES } from "@/data/categories";
import { AFRIKAANS_CATEGORIES } from "@/data/afrikaans";
import { useLanguage } from "@/components/language-provider";
import { QUESTIONS } from "@/lib/quiz";
import { SIGNS } from "@/data/signs";
import { pageHead } from "@/lib/metadata";
import road from "@/assets/study-road.jpg";
export const Route = createFileRoute("/")({
  head: () =>
    pageHead(
      "My learning",
      "Your South African K53 study journey: eight categories, road signs, practice and mock tests.",
    ),
  component: Dashboard,
});
function Dashboard() {
  const { progress, name } = useStudy();
  const { language } = useLanguage();
  const af = language === "af";
  const categories = af ? AFRIKAANS_CATEGORIES : CATEGORIES;
  const words = af ? { moving:"HOU AAN BEWEEG", all:"Jy het elke kategorie verken.", welcome:`Welkom terug, ${name}.`, start:"Jou pad na gereedheid begin hier.", intro:"’n Bietjie leer vandag. Baie meer selfvertroue môre.", journey:"Jou leerderreis", learn:"LEER. OEFEN. SLAAG.", know:"Ken die tekens. Verstaan die reëls.", next:"Neem die volgende draai met selfvertroue.", practiseAll:"Oefen alle kategorieë", continue:"Gaan voort met leer", begin:"Begin jou leerreis", explored:"Kategorieë verken", foundation:"Bou ’n sterk grondslag", questions:"Vrae geoefen", toExplore:"vrae om te verken", accuracy:"Oefenakkuraatheid", step:"Elke antwoord is ’n stap vorentoe", progress:"Leervordering", pace:"Jou eie pas. Jou eie pad.", path:"Jou leerpad", pathSub:"Agt kernbeginsels. Een selfversekerde bestuurder.", view:"Bekyk alles", steps:["Leer","Oefen","Hersien","Proeftoets","Gereed"], status:"Verken", startHere:"Begin hier", count:"vrae", inProgress:"Aan die gang", explore:"Verken", daily:"’n Bietjie elke dag", small:"Klein treë.", lasting:"Volgehoue selfvertroue.", dailyText:"Maak tyd vir ’n paar vrae. Kom môre terug en behou jou momentum.", checkin:"’n Kontrole met 10 vrae", lets:"Kom ons oefen", read:"LEES DIE PAD", story:"Elke teken vertel ’n storie.", entries:"padtekeninskrywings en hul betekenisse.", open:"Maak die tekenbiblioteek oop", mindset:"DIE K53-INSTELLING", quote:"Kyk vorentoe. Dink vooruit.\nLaat jouself ’n uitweg.", defensive:"Verdedigende bestuur begin by waarneming.", caption:"SUID-AFRIKAANSE PAAIE. JOU VOLGENDE HOOFSTUK." } : { moving:"{words.moving}", all:"You’ve explored every category.", welcome:words.welcome, start:words.start, intro:"A little learning today. A lot more confidence tomorrow.", journey:"{words.journey}", learn:"{words.learn}", know:"{words.know}", next:"{words.next}", practiseAll:"{words.practiseAll}", continue:words.continue, begin:words.begin, explored:"Categories explored", foundation:"Build a strong foundation", questions:"Questions practised", toExplore:"questions to explore", accuracy:"Practice accuracy", step:"Every answer is a step forward", progress:"Learning progress", pace:"Your own pace. Your own path.", path:"Your learning path", pathSub:"Eight essentials. One confident driver.", view:"{words.view}", steps:["Learn","Practise","Review","Mock test","Ready"], status:"{words.status}", startHere:"{words.startHere}", count:"questions", inProgress:words.inProgress, explore:words.explore, daily:"A little every day", small:"{words.small}", lasting:"{words.lasting}", dailyText:"{words.dailyText}", checkin:"{words.checkin}", lets:"{words.lets}", read:"{words.read}", story:"Every sign has a story.", entries:"{words.entries}", open:"{words.open}", mindset:"{words.mindset}", quote:"Look ahead. Think ahead.\nLeave yourself a way out.", defensive:"{words.defensive}", caption:"{words.caption}" };
  const answered = new Set(progress.attempts.map((a) => a.question_id)).size;
  const accuracy = progress.attempts.length
    ? Math.round(
        (progress.attempts.filter((a) => a.correct).length / progress.attempts.length) * 100,
      )
    : 0;
  const next = categories.findIndex((_, i) => !progress.learned.includes(i));
  const allCategories{words.status} = next === -1;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{words.moving}</span>
          <h1>
            {allCategories{words.status}
              ? "You’ve explored every category."
              : progress.attempts.length
                ? words.welcome
                : words.start}
          </h1>
          <p>{words.intro}</p>
        </div>
        <span className="journey-label">
          <RouteIcon size={16} />
          {words.journey}
        </span>
      </div>
      <section className="road-feature">
        <img
          src={road}
          alt={af ? "’n Oop Suid-Afrikaanse pad wat deur groen berge kronkel" : "An open South African road winding through green mountains"}
          width={1408}
          height={704}
        />
        <div className="road-shade" />
        <div className="road-copy">
          <span className="feature-label">
            <span />
            {words.learn}
          </span>
          <h2>K53 Master SA</h2>
          <p>
            {words.know}
            <br />
            {words.next}
          </p>
          <Button asChild size="lg">
            {allCategories{words.status} ? (
              <Link to="/practice">
                {words.practiseAll}
                <ArrowRight />
              </Link>
            ) : (
              <Link to="/learn" search={{ category: next }}>
                {progress.learned.length ? words.continue : words.begin}
                <ArrowRight />
              </Link>
            )}
          </Button>
        </div>
        <div className="road-caption">
          <MapPinIcon /> {words.caption}
        </div>
      </section>
      <section className="stats-row">
        <Stat
          icon={BookOpen}
          label={words.explored}
          value={`${progress.learned.length} / 8`}
          sub={words.foundation}
        />
        <Stat
          icon={ClipboardCheck}
          label={words.questions}
          value={String(answered)}
          sub={`${QUESTIONS.length} ${words.toExplore}`}
        />
        <Stat
          icon={Target}
          label={words.accuracy}
          value={progress.attempts.length ? `${accuracy}%` : "—"}
          sub={words.step}
        />
        <Stat
          icon={ShieldCheck}
          label={words.progress}
          value={`${Math.round((progress.learned.length / 8) * 100)}%`}
          sub={words.pace}
        />
      </section>
      <div className="learning-layout">
        <section className="learning-section">
          <div className="section-heading">
            <div>
              <h2>{words.path}</h2>
              <p>{words.pathSub}</p>
            </div>
            <Button asChild variant="ghost">
              <Link to="/learn">
                {words.view}
                <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="path-steps">
            {words.steps.map((s, i) => (
              <span key={s} className={i === 0 ? "step-active" : ""}>
                <b>{i + 1}</b>
                {s}
                {i < 4 ? <ChevronRight size={14} /> : null}
              </span>
            ))}
          </div>
          <div className="category-grid">
            {categories.map((cat, i) => {
              const learned = progress.learned.includes(i);
              const attempts = progress.attempts.filter((a) => a.category === i);
              return (
                <Link
                  to="/learn"
                  search={{ category: i }}
                  key={cat.name}
                  className={`category-card category-tone-${i % 4}`}
                >
                  <div className="category-top">
                    <span className="category-number">{String(i + 1).padStart(2, "0")}</span>
                    {learned ? (
                      <span className="category-status">
                        <Check size={12} />
                        {words.status}
                      </span>
                    ) : i === next ? (
                      <span className="category-status next-status">{words.startHere}</span>
                    ) : null}
                  </div>
                  <h3>{cat.name}</h3>
                  <p>{cat.description}</p>
                  <div className="category-bottom">
                    <span>{QUESTIONS.filter((q) => q.cat === i).length} {words.count}</span>
                    <span>
                      {attempts.length ? words.inProgress : words.explore}
                      <ArrowRight size={15} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
        <aside className="study-aside">
          <div className="section-heading">
            <h2>{words.daily}</h2>
          </div>
          <div className="daily-note">
            <div className="daily-icon">
              <TrendingUp />
            </div>
            <h3>
              {words.small}
              <br />
              {words.lasting}
            </h3>
            <p>{words.dailyText}</p>
            <span>
              <Clock size={14} /> {words.checkin}
            </span>
            <Button asChild>
              <Link to="/practice">
                {words.lets}
                <ArrowRight />
              </Link>
            </Button>
          </div>
          <Link to="/signs" className="signs-preview">
            <div className="preview-signs">
              <svg viewBox="0 0 100 100" aria-label={af ? "Stopteken" : "Stop sign"}>
                <polygon
                  points="30,4 70,4 96,30 96,70 70,96 30,96 4,70 4,30"
                  fill="var(--sign-red)"
                  stroke="var(--sign-paper)"
                  strokeWidth="3"
                />
                <text
                  x="50"
                  y="58"
                  textAnchor="middle"
                  fill="var(--sign-paper)"
                  fontSize="25"
                  fontWeight="800"
                >
                  STOP
                </text>
              </svg>
              <svg viewBox="0 0 100 100" aria-label={af ? "Maksimumspoed 60" : "Maximum speed 60"}>
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="var(--sign-paper)"
                  stroke="var(--sign-red)"
                  strokeWidth="9"
                />
                <text
                  x="50"
                  y="64"
                  textAnchor="middle"
                  fontSize="41"
                  fontWeight="700"
                  fill="var(--sign-ink)"
                >
                  60
                </text>
              </svg>
            </div>
            <span className="eyebrow">{words.read}</span>
            <h3>{words.story}</h3>
            <p>Explore {SIGNS.length} {words.entries}</p>
            <span className="text-link">
              {words.open}
              <ArrowRight size={16} />
            </span>
          </Link>
          <div className="study-tip">
            <span>{words.mindset}</span>
            <p>
              “Look ahead. Think ahead.
              <br />
              Leave yourself a way out.”
            </p>
            <small>{words.defensive}</small>
          </div>
        </aside>
      </div>
    </>
  );
}
function MapPinIcon() {
  return <Signpost size={13} />;
}
function Stat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="stat">
      <div>
        <span>{label}</span>
        <Icon size={19} />
      </div>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  );
}
