import type { Question } from "@/lib/quiz";

export type VehicleControlType = "motorcycle" | "light" | "heavy";

function NumberTag({ n, x, y }: { n: number; x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="14" fill="#fff" stroke="#263746" strokeWidth="2.5" />
      <text x={x} y={y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="#172b3a">{n}</text>
    </g>
  );
}

function MotorcycleDiagram() {
  return (
    <svg viewBox="0 0 620 390" role="img" aria-label="Numbered motorcycle controls diagram" className="vehicle-control-svg">
      <g fill="none" stroke="#34495a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="310" cy="55" rx="32" ry="48" />
        <ellipse cx="310" cy="326" rx="34" ry="53" />
        <path d="M310 105 L310 270 M280 105 L340 105 M310 270 L285 305 L335 305" />
        <path d="M280 105 L225 75 M340 105 L395 75 M225 75 L190 75 M395 75 L430 75" />
        <path d="M285 305 L245 330 M335 305 L375 330" />
        <path d="M282 145 Q310 120 338 145 L355 222 Q310 250 265 222 Z" fill="#e7edf1" />
        <path d="M270 222 Q310 250 350 222" />
        <path d="M250 115 L225 75 M370 115 L395 75" />
        <path d="M300 272 L285 295 M320 272 L335 295" />
        <path d="M240 74 L225 48 M380 74 L395 48" />
      </g>
      <g fill="#dfe7ec" stroke="#34495a" strokeWidth="3">
        <rect x="183" y="64" width="32" height="20" rx="6" />
        <rect x="405" y="64" width="32" height="20" rx="6" />
        <rect x="270" y="145" width="80" height="75" rx="28" />
      </g>
      <g fill="none" stroke="#34495a" strokeWidth="2.5" strokeDasharray="5 5">
        <path d="M170 80 L145 80 M450 80 L475 80 M230 328 L190 350 M390 328 L430 350" />
      </g>
      <NumberTag n={1} x={200} y={350} />
      <NumberTag n={2} x={158} y={108} />
      <NumberTag n={3} x={310} y={18} />
      <NumberTag n={4} x={455} y={108} />
      <NumberTag n={5} x={488} y={76} />
      <NumberTag n={6} x={205} y={145} />
      <NumberTag n={7} x={420} y={350} />
      <NumberTag n={8} x={310} y={92} />
      <NumberTag n={9} x={310} y={185} />
    </svg>
  );
}

function DashboardDiagram({ vehicle, automatic }: { vehicle: "light" | "heavy"; automatic: boolean }) {
  const heavy = vehicle === "heavy";
  return (
    <div className={`vehicle-control-panel ${heavy ? "vehicle-control-heavy" : "vehicle-control-light"}`}>
      <h4>{automatic ? "Automatic gearbox" : "Manual gearbox"}</h4>
      <svg viewBox="0 0 620 330" role="img" aria-label={`Numbered ${heavy ? "heavy" : "light"} vehicle ${automatic ? "automatic" : "manual"} controls diagram`} className="vehicle-control-svg">
        <g fill="none" stroke="#34495a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
          <path d={heavy ? "M70 105 Q70 40 145 35 L475 35 Q550 40 550 105 L550 245 L70 245 Z" : "M95 100 Q95 45 155 38 L465 38 Q525 45 525 100 L525 235 L95 235 Z"} fill="#edf1f4" />
          <path d="M110 105 L510 105" />
          <path d="M115 95 L505 95" strokeWidth="2" />
          <path d="M170 70 L450 70" strokeWidth="2" />
          <path d="M280 105 L280 235" strokeWidth="2" />
          <circle cx="445" cy="175" r="52" />
          <circle cx="445" cy="175" r="15" />
          <path d="M445 123 L445 227 M393 175 L497 175 M408 138 L482 212 M482 138 L408 212" strokeWidth="3" />
          <path d="M355 225 L355 275" strokeWidth="5" />
          <path d="M310 225 L310 275" strokeWidth="5" />
          <path d="M400 225 L400 275" strokeWidth="5" />
          <path d="M235 235 L235 270" strokeWidth="4" />
          <path d="M200 235 L200 270" strokeWidth="4" />
          <path d="M260 235 L260 270" strokeWidth="4" />
          <path d="M150 235 L150 255 M150 255 L180 255" strokeWidth="4" />
          <path d="M110 100 L85 85 M510 100 L535 85" strokeWidth="3" />
        </g>
        <g fill="#dfe7ec" stroke="#34495a" strokeWidth="2.5">
          <rect x="278" y="42" width="64" height="18" rx="5" />
          <rect x="74" y="85" width="35" height="22" rx="5" />
          <rect x="511" y="85" width="35" height="22" rx="5" />
          <rect x="330" y="130" width="42" height="30" rx="5" />
          <rect x="345" y="220" width="20" height="18" rx="3" />
        </g>
        <g fill="none" stroke="#34495a" strokeWidth="2.5" strokeDasharray="5 5">
          <path d="M310 52 L270 20 M90 95 L55 65 M530 95 L565 65" />
        </g>
        <NumberTag n={1} x={310} y={25} />
        <NumberTag n={2} x={185} y={85} />
        <NumberTag n={3} x={45} y={85} />
        <NumberTag n={3} x={575} y={85} />
        <NumberTag n={4} x={445} y={110} />
        <NumberTag n={5} x={390} y={135} />
        <NumberTag n={6} x={350} y={185} />
        <NumberTag n={7} x={350} y={295} />
        {!automatic ? <NumberTag n={8} x={235} y={295} /> : null}
        <NumberTag n={9} x={310} y={295} />
        <NumberTag n={10} x={400} y={295} />
        <NumberTag n={11} x={445} y={175} />
      </svg>
    </div>
  );
}

export function VehicleControlsGraphic({ vehicle, language }: { vehicle: VehicleControlType; language: "en" | "af" }) {
  const title = language === "af" ? "2012 Departement van Vervoer: voertuigkontroles" : "2012 Department of Transport: vehicle controls";
  const description = language === "af"
    ? "Oorspronklike skematiese uitleg volgens die Junie 2012-handleiding se genommerde kontroles."
    : "Original schematic redraw following the numbered controls in the June 2012 manual.";
  const source = "https://www.arrivealive.co.za/documents/Presentations/3%20Vehicle%20Controls%20Manual%20Jun%202012%20Final.pdf";
  return (
    <figure className="question-image question-vehicle-controls">
      <div className="vehicle-control-card">
        <h3>{title}</h3>
        {vehicle === "motorcycle" ? (
          <>
            <h4>{language === "af" ? "Motorfiets" : "Motorcycle"}</h4>
            <MotorcycleDiagram />
          </>
        ) : (
          <div className="vehicle-control-comparison">
            <DashboardDiagram vehicle={vehicle} automatic={false} />
            <DashboardDiagram vehicle={vehicle} automatic />
          </div>
        )}
        <p>{description}</p>
      </div>
      <figcaption>
        {language === "af" ? "Bron: Suid-Afrikaanse Departement van Vervoer, Vehicle Components and Controls Manual, Junie 2012." : "Source: South African Department of Transport, Vehicle Components and Controls Manual, June 2012."}{" "}
        <a href={source} target="_blank" rel="noreferrer">{language === "af" ? "Maak die oorspronklike handleiding oop (PDF)" : "Open the original manual (PDF)"}</a>
      </figcaption>
    </figure>
  );
}
