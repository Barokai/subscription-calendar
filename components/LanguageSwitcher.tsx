"use client";

import React from "react";
import { useI18n, type Language } from "@/lib/i18n";

const LANGUAGES: { code: Language; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "de", label: "DE" },
];

interface LanguageSwitcherProps {
  isDarkMode?: boolean;
}

export default function LanguageSwitcher({ isDarkMode = true }: LanguageSwitcherProps) {
  const { lang, setLang } = useI18n();

  return (
    <div className="flex items-center gap-1">
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          title={code === "en" ? "English" : "Deutsch"}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            lang === code
              ? isDarkMode
                ? "bg-blue-600 text-white"
                : "bg-blue-500 text-white"
              : isDarkMode
              ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
