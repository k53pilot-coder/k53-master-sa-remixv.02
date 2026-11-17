import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Car, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AFRIKAANS_PRACTICAL } from "@/data/afrikaans";
import { useLanguage } from "@/components/language-provider";
import { pageHead } from "@/lib/metadata";
export const Route = createFileRoute("/practical")({
  head: () => pageHead("Practical driving guide", "Prepare for K53 pre-trip inspection, yard manoeuvres and on-road driving."),
  component: Practical,
});
const checklists = [
 { name:"Before you move", items:["Check around and underneath the vehicle for obstacles and leaks.","Inspect tyres, wheels, lights, windows and mirrors.","Adjust seat, mirrors and seat belt.","Check parking brake, gear position and instruments.","Observe all around, including blind spots, before moving."] },
 { name:"Yard manoeuvres", items:["Observe before every manoeuvre and direction change.","Keep movement slow and controlled.","Practise parking without touching boundaries or obstacles.","Use the parking brake correctly on an incline.","Signal clearly and cancel the indicator afterwards."] },
 { name:"On the road", items:["Check mirrors before slowing down or changing direction.","Signal in good time and check the relevant blind spot.","Keep a safe following distance.","Obey signs, markings and signals.","Plan ahead at intersections, crossings and hazards."] },
];
function Practical() {
 const [checks,setChecks] = useState<string[]>([]);
 const {language} = useLanguage();
 const af = language === "af";
 const sections = af ? AFRIKAANS_PRACTICAL.sections : checklists;
 return <><div className="page-heading"><div><span className="eyebrow">{af ? AFRIKAANS_PRACTICAL.eyebrow : "FROM THEORY TO THE ROAD"}</span><h1>{af ? AFRIKAANS_PRACTICAL.title : "Practical driving guide"}</h1><p>{af ? AFRIKAANS_PRACTICAL.subtitle : "Good observation. Smooth control. Safe decisions."}</p></div><Car className="heading-icon"/></div><div className="lesson-body">{sections.map((section, sectionIndex) => (
      <section key={sectionIndex}>
        <div>
          <h2>{section.name}</h2>
          {section.items.map((item, itemIndex) => {
            const itemId = sectionIndex + "-" + itemIndex;
            return (
              <label className="checklist-item" key={itemId}>
                <input
                  type="checkbox"
                  checked={checks.includes(itemId)}
                  onChange={(event) =>
                    setChecks((current) =>
                      event.target.checked
                        ? [...current, itemId]
                        : current.filter((checkedId) => checkedId !== itemId),
                    )
                  }
                />
                <span>{item}</span>
              </label>
            );
          })}
        </div>
      </section>
    ))}</div><p>{af ? AFRIKAANS_PRACTICAL.note : "Use your vehicle-specific official manual and a qualified instructor for the full assessment requirements."}</p><Button variant="outline" onClick={()=>setChecks([])}><Check/>{af ? AFRIKAANS_PRACTICAL.reset : "Reset checklist"}</Button></>;
}
