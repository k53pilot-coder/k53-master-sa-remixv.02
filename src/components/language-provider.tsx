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
