"use client";
import React, { createContext, useContext, useCallback } from "react";
import { en, type Translations } from "./locales/en";

type Locale = "en" | "fr" | "es" | "de";

interface I18nContextType {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  t: en,
  setLocale: () => {},
});

const translations: Record<Locale, Translations> = {
  en,
  // Future locales will be added here
  fr: en,
  es: en,
  de: en,
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>("en");

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("locale", l);
  }, []);

  React.useEffect(() => {
    const stored = localStorage.getItem("locale") as Locale | null;
    if (stored && translations[stored]) {
      setLocaleState(stored);
    }
  }, []);

  const t = translations[locale] || en;

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
