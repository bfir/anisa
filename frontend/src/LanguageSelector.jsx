import { Globe2 } from "lucide-react";
import { useLocale } from "./localeContext";
import { languages } from "./translations";

export default function LanguageSelector() {
  const { language, setLanguage, t } = useLocale();
  return (
    <label className="language-selector">
      <Globe2 size={16} aria-hidden="true" />
      <span className="sr-only">{t("interfaceLanguage")}</span>
      <select value={language} onChange={(e) => setLanguage(e.target.value)}>
        {Object.entries(languages).map(([code, name]) => (
          <option key={code} value={code} lang={code}>{name}</option>
        ))}
      </select>
    </label>
  );
}
