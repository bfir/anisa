import { useEffect, useState } from "react";
import { LocaleContext } from "./localeContext";
import { languages, localeNames, translate } from "./translations";

export function LocaleProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    try {
      const saved = localStorage.getItem("anisa-language");
      return Object.hasOwn(languages, saved) ? saved : "es";
    } catch {
      return "es";
    }
  });
  const locale = localeNames[language];

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    try {
      localStorage.setItem("anisa-language", language);
    } catch {
      // Browsers with storage disabled can still switch language.
    }
  }, [language]);

  function formatDate(value, options) {
    if (!value) return "—";
    const input = typeof value === "string"
      ? value.length === 10 ? `${value}T00:00:00` : value.replace(" ", "T")
      : value;
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return String(value);
    const defaults = typeof value === "string" && value.length === 10
      ? { dateStyle: "medium" }
      : { dateStyle: "medium", timeStyle: "short" };
    return new Intl.DateTimeFormat(locale, options ?? defaults).format(date);
  }

  const value = {
    language,
    locale,
    setLanguage,
    t: (key, params) => translate(language, key, params),
    formatDate,
    number: (value) => new Intl.NumberFormat(locale).format(value),
    currency: (value) => new Intl.NumberFormat(locale, {
      style: "currency", currency: "EUR",
    }).format(value),
  };
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
