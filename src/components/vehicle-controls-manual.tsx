import { useState } from "react";
import type { VehicleControlType } from "@/lib/question-visuals";

const MANUAL_URL =
  "https://thek53guy.co.za/wp-content/uploads/k53/downloads/3_Vehicle_Controls_Manual_v100_Jun_2012.pdf";

const MANUAL_PAGES: Record<VehicleControlType, number[]> = {
  motorcycle: [3, 4, 5, 6],
  light: [8, 9, 10],
  heavy: [12, 13, 14],
};

export function VehicleControlsManual({
  vehicle,
  language,
}: {
  vehicle: VehicleControlType;
  language: "en" | "af";
}) {
  const pages = MANUAL_PAGES[vehicle];
  const [page, setPage] = useState(pages[0]);
  const title =
    language === "af"
      ? "Departement van Vervoer: Voertuigkomponente en -kontroles (Junie 2012)"
      : "Department of Transport: Vehicle Components and Controls (June 2012)";
  const pageLabel = language === "af" ? "Handleidingbladsy" : "Manual page";
  const sourceLabel =
    language === "af" ? "Maak die oorspronklike PDF oop" : "Open the original PDF";

  return (
    <figure className="question-image question-vehicle-manual">
      <figcaption>{title}</figcaption>
      <nav aria-label={language === "af" ? "Kies handleidingbladsy" : "Select manual page"} className="vehicle-manual-pages">
        {pages.map((number) => (
          <button
            key={number}
            type="button"
            aria-pressed={page === number}
            onClick={() => setPage(number)}
          >
            {pageLabel} {number}
          </button>
        ))}
      </nav>
      <iframe
        key={page}
        src={`${MANUAL_URL}#page=${page}&view=FitH&toolbar=0`}
        title={`${title} - ${pageLabel} ${page}`}
        loading="lazy"
        style={{ display: "block", width: "100%", height: "min(76vh, 760px)", minHeight: "480px", border: 0 }}
      />
      <p>
        {language === "af"
          ? "Bron: Suid-Afrikaanse Departement van Vervoer, SA Learner Driver Manual, Section 3, Version 1.00, Junie 2012. Die oorspronklike bladsy word onveranderd vertoon."
          : "Source: South African Department of Transport, SA Learner Driver Manual, Section 3, Version 1.00, June 2012. The original page is displayed unchanged."}{" "}
        <a href={`${MANUAL_URL}#page=${page}`} target="_blank" rel="noreferrer">
          {sourceLabel}
        </a>
      </p>
    </figure>
  );
}
