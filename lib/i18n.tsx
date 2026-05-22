"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { en } from "@/locales/en";
import { de } from "@/locales/de";
import type { Locale } from "@/locales/en";

export type Language = "en" | "de";

const LOCALES: Record<Language, Locale> = { en, de };
const STORAGE_KEY = "app_language";
const LOCALE_MAP: Record<Language, string> = {
  en: "en-US",
  de: "de-AT",
};

interface I18nContextValue {
  t: Locale;
  lang: Language;
  setLang: (lang: Language) => void;
  userLocale: string;
  /** Interpolate a template string: tpl("Hello {name}", { name: "World" }) */
  tpl: (template: string, vars: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function detectBrowserLanguage(): Language {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language?.toLowerCase() ?? "";
  return lang.startsWith("de") ? "de" : "en";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    const resolved: Language =
      stored === "en" || stored === "de" ? stored : detectBrowserLanguage();
    setLangState(resolved);
  }, []);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const tpl = useCallback(
    (template: string, vars: Record<string, string | number>) =>
      template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? "")),
    []
  );

  const value = useMemo(
    () => ({
      t: LOCALES[lang],
      lang,
      setLang,
      userLocale: LOCALE_MAP[lang],
      tpl,
    }),
    [lang, setLang, tpl]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
