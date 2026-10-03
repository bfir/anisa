import { useState } from "react";
import { Search, Send } from "lucide-react";
import { apiFetch } from "./apiClient";
import { useLocale } from "./localeContext";
import { patientLanguages } from "./translations";
import { EmptyState, MessageHistory, Notice, PageHeading } from "./Ui";

export default function Mensajes() {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState([]);
  const [type, setType] = useState("informativo");
  const [language, setLanguage] = useState("es");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [searched, setSearched] = useState(false);

  async function search(event) {
    event.preventDefault();
    if (!query.trim() || busy) return;
    setBusy(true); setNotice(null); setSearched(false);
    try {
      setResults(await apiFetch(`/pacientes/buscar?nombre=${encodeURIComponent(query.trim())}`));
      setSearched(true);
    } catch {
      setNotice({ tone: "error", key: "loadError" });
    } finally { setBusy(false); }
  }

  async function choose(nextPatient) {
    setPatient(nextPatient); setLanguage(nextPatient.idioma); setResults([]); setSearched(false); setQuery(""); setNotice(null); setHistory([]); setBusy(true);
    try { setHistory(await apiFetch(`/pacientes/${nextPatient.id}/mensajes`)); }
    catch { setNotice({ tone: "error", key: "loadError" }); }
    finally { setBusy(false); }
  }

  async function send(event) {
    event.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true); setNotice(null);
    try {
      const message = await apiFetch("/mensajes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paciente_id: patient.id, tipo: type, idioma: language, texto: text.trim() }),
      });
      setHistory((items) => [message, ...items]); setText("");
      setNotice({ tone: message.estado_envio === "enviado" ? "success" : "warning", key: message.estado_envio === "enviado" ? "sentSuccessfully" : "savedEmailFailed" });
    } catch {
      setNotice({ tone: "error", key: "messageError" });
      try { setHistory(await apiFetch(`/pacientes/${patient.id}/mensajes`)); } catch { /* Existing history remains visible. */ }
    } finally { setBusy(false); }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeading title={t("messages")} description={t("messageIntro")} />
      <form onSubmit={search} className="search-form">
        <label className="search-input"><span className="field-label">{t("searchName")}</span><Search size={17} aria-hidden="true" /><input className="field" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchPlaceholder")} /></label>
        <button className="button button-primary" disabled={busy || !query.trim()}>{t(busy && !patient ? "searching" : "search")}</button>
      </form>
      {notice && <div className="mb-5"><Notice tone={notice.tone}>{t(notice.key)}</Notice></div>}
      {searched && results.length === 0 && <EmptyState>{t("noResults")}</EmptyState>}
      {results.length > 0 && <section className="panel mb-6">{results.map((result) => (
        <button key={result.id} onClick={() => choose(result)} className="patient-choice"><span className="min-w-0"><span className="block font-semibold">{result.nombre}</span><span className="block meta">{result.pais} · <bdi>{patientLanguages[result.idioma] ?? result.idioma}</bdi></span></span></button>
      ))}</section>}
      {patient && (
        <section className="panel">
          <div className="panel-heading"><div><h2>{patient.nombre}</h2><p className="meta">{t("usualLanguage")}: <bdi>{patientLanguages[patient.idioma] ?? patient.idioma}</bdi></p></div></div>
          <form onSubmit={send} className="panel-body space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <label><span className="field-label">{t("messageType")}</span><select className="field" value={type} onChange={(e) => setType(e.target.value)}><option value="recordatorio_cita">{t("appointmentReminder")}</option><option value="pago_pendiente">{t("paymentReminder")}</option><option value="informativo">{t("informational")}</option></select></label>
              <label><span className="field-label">{t("language")}</span><select className="field" value={language} onChange={(e) => setLanguage(e.target.value)}>{Object.entries(patientLanguages).map(([code, name]) => <option key={code} value={code} lang={code}>{name}</option>)}</select></label>
            </div>
            <label><span className="field-label">{t("messageBody")}</span><textarea className="field" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("messagePlaceholder")} dir={language === "ar" ? "rtl" : "ltr"} lang={language} /></label>
            <button className="button button-primary" disabled={busy || !text.trim()}><Send size={16} aria-hidden="true" />{t(busy ? "sending" : "sendMessage")}</button>
          </form>
          <div className="panel-body"><h3 className="mb-2">{t("history")}</h3><MessageHistory messages={history} /></div>
        </section>
      )}
    </div>
  );
}
