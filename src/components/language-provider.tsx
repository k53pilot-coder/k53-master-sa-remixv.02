import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AppLanguage = "en" | "af";

const messages = {
  en: {
    "nav.learning": "My learning",
    "nav.categories": "Learn by category",
    "nav.signs": "Road signs",
    "nav.practice": "Practice questions",
    "nav.mock": "Mock test",
    "nav.review": "Review mistakes",
    "nav.space": "YOUR LEARNING SPACE",
    "nav.road": "ON THE ROAD",
    "nav.practical": "Practical driving guide",
    "nav.resources": "DLTC & resources",
    "nav.about": "About & legal",
    "nav.admin": "Administration",
    "brand.tagline": "Made for South African roads",
    "brand.motto": "Learn with confidence. Drive with care.",
    "breadcrumb": "Your journey",
    "account.learner": "Learner",
    "account.my": "My account",
    "account.signin": "Sign in to sync",
    "language.label": "Language",
    "language.english": "English",
    "language.afrikaans": "Afrikaans",
    "quiz.mockResults": "MOCK TEST RESULTS",
    "quiz.practiceComplete": "PRACTICE COMPLETE",
    "quiz.passed": "You passed this mock test.",
    "quiz.keepGoing": "Keep building your confidence.",
    "quiz.anotherStep": "Another step forward.",
    "quiz.correct": "correct",
    "quiz.passedShort": "Passed",
    "quiz.morePractice": "More practice needed",
    "quiz.target": "target",
    "quiz.practiseAgain": "Practise again",
    "quiz.review": "Review mistakes",
    "quiz.answers": "Your answers",
    "quiz.correctAnswer": "Correct answer:",
    "quiz.noQuestions": "No questions available.",
    "quiz.mock": "MOCK TEST",
    "quiz.practice": "PRACTICE",
    "quiz.question": "QUESTION",
    "quiz.of": "OF",
    "quiz.correctFeedback": "That’s correct.",
    "quiz.incorrectFeedback": "Not quite. Keep learning.",
    "quiz.exit": "Exit",
    "quiz.test": "test",
    "quiz.finish": "Finish & see results",
    "quiz.next": "Next question",
    "quiz.previous": "Previous",
    "quiz.category0": "Sign categories",
    "quiz.category1": "Regulatory and warning signs",
    "quiz.category2": "Road markings",
    "quiz.category3": "Traffic signals and traffic officers",
    "quiz.category4": "Driving rules, safety and vehicle loads",
    "quiz.category5": "K53 defensive-driving system and steering",
    "quiz.category6": "Vehicle controls and licensing documents",
    "quiz.category7": "Driving emergencies and vehicle maintenance",
  },
  af: {
    "nav.learning": "My leerwerk",
    "nav.categories": "Leer volgens kategorie",
    "nav.signs": "Padtekens",
    "nav.practice": "Oefenvrae",
    "nav.mock": "Proeftoets",
    "nav.review": "Hersien foute",
    "nav.space": "JOU LEERRUIMTE",
    "nav.road": "OP DIE PAD",
    "nav.practical": "Praktiese bestuursgids",
    "nav.resources": "DLTC en hulpbronne",
    "nav.about": "Oor ons en regskennisgewings",
    "nav.admin": "Administrasie",
    "brand.tagline": "Ontwikkel vir Suid-Afrikaanse paaie",
    "brand.motto": "Leer met selfvertroue. Bestuur versigtig.",
    "breadcrumb": "Jou vordering",
    "account.learner": "Leerder",
    "account.my": "My rekening",
    "account.signin": "Meld aan om te sinkroniseer",
    "language.label": "Taal",
    "language.english": "Engels",
    "language.afrikaans": "Afrikaans",
    "quiz.mockResults": "RESULTATE VAN DIE PROEFTOETS",
    "quiz.practiceComplete": "OEFENING VOLTOOI",
    "quiz.passed": "Jy het hierdie proeftoets geslaag.",
    "quiz.keepGoing": "Hou aan om jou selfvertroue op te bou.",
    "quiz.anotherStep": "Nog ’n stap vorentoe.",
    "quiz.correct": "korrek",
    "quiz.passedShort": "Geslaag",
    "quiz.morePractice": "Meer oefening is nodig",
    "quiz.target": "teiken",
    "quiz.practiseAgain": "Oefen weer",
    "quiz.review": "Hersien foute",
    "quiz.answers": "Jou antwoorde",
    "quiz.correctAnswer": "Korrekte antwoord:",
    "quiz.noQuestions": "Geen vrae beskikbaar nie.",
    "quiz.mock": "PROEFTOETS",
    "quiz.practice": "OEFENING",
    "quiz.question": "VRAAG",
    "quiz.of": "VAN",
    "quiz.correctFeedback": "Dit is korrek.",
    "quiz.incorrectFeedback": "Nie heeltemal nie. Hou aan leer.",
    "quiz.exit": "Verlaat",
    "quiz.test": "toets",
    "quiz.finish": "Voltooi en sien resultate",
    "quiz.next": "Volgende vraag",
    "quiz.previous": "Vorige",
    "quiz.category0": "Padtekenkategorieë",
    "quiz.category1": "Regulerende en waarskuwingstekens",
    "quiz.category2": "Padmerke",
    "quiz.category3": "Verkeersligte en verkeersbeamptes",
    "quiz.category4": "Bestuursreëls, veiligheid en voertuigvragte",
    "quiz.category5": "K53-verdedigende bestuurstelsel en stuurbeheer",
    "quiz.category6": "Voertuigkontroles en lisensiedokumente",
    "quiz.category7": "Bestuursnoodgevalle en voertuigonderhoud",
  },
} as const;

type MessageKey = keyof typeof messages.en;
type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: MessageKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("k53-language");
    if (saved === "en" || saved === "af") setLanguageState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem("k53-language", language);
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: setLanguageState,
      t: (key) => messages[language][key],
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
