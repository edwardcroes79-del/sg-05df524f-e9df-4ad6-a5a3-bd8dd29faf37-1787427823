import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { defaultLanguage, languages, translate, type LanguageCode, type TranslationKey } from "@/lib/i18n";

interface I18nContextValue {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const storageKey = "royalty_stamp_language";

function isLanguageCode(value: string | null): value is LanguageCode {
  return Boolean(value && value in languages);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(defaultLanguage);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedLanguage = window.localStorage.getItem(storageKey);
    if (isLanguageCode(storedLanguage)) {
      setLanguageState(storedLanguage);
      document.documentElement.lang = storedLanguage;
      return;
    }

    document.documentElement.lang = defaultLanguage;
  }, []);

  const setLanguage = (nextLanguage: LanguageCode) => {
    setLanguageState(nextLanguage);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, nextLanguage);
      document.documentElement.lang = nextLanguage;
    }
  };

  const value = useMemo<I18nContextValue>(() => {
    return {
      language,
      setLanguage,
      t: (key, values) => translate(language, key, values),
    };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }

  return context;
}

export { languages };
export type { LanguageCode, TranslationKey };