import { useState } from "react";
import { Search } from "lucide-react";
import { apiFetch } from "./apiClient";
import { useLocale } from "./localeContext";
import { patientLanguages } from "./translations";
import { AppointmentStatus, Avatar, EmptyState, MessageHistory, Notice, PageHeading } from "./Ui";

export default function Pacientes() {
  const { t, formatDate } = useLocale();
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [searching, setSearching] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  async function search(event) {
    event.preventDefault();
    if (!query.trim() || searching) return;
    setSearching(true); setSearched(false); setError(""); setSelected(null);
    try {
      const result = await apiFetch(`/pacientes/buscar?nombre=${encodeURIComponent(query.trim())}`);
      setPatients(result); setSearched(true);
    } catch {
      setError("loadError");
    } finally {
      setSearching(false);
    }
  }

  async function open(patient) {
    setSelected(patient); setDetailLoading(true); setError("");
    try {
      const [nextAppointments, recentMessages] = await Promise.all([
        apiFetch(`/pacientes/${patient.id}/citas`), apiFetch(`/pacientes/${patient.id}/mensajes`),
      ]);
      setAppointments(nextAppointments); setMessages(recentMessages);
    } catch {
      setError("loadError");
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <>
      <PageHeading title={t("patients")} description={t("patientIntro")} />
      <form onSubmit={search} className="search-form">
        <label className="search-input"><span className="field-label">{t("searchName")}</span><Search size={17} aria-hidden="true" />
          <input className="field" name="patientName" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchPlaceholder")} autoComplete="off" />
        </label>
        <button className="button button-primary" disabled={searching || !query.trim()}>{t(searching ? "searching" : "search")}</button>
      </form>
      {error && <div className="mb-6"><Notice>{t(error)}</Notice></div>}
      {!searched && patients.length === 0 && <EmptyState>{t("searchHint")}</EmptyState>}
      {searched && patients.length === 0 && <EmptyState>{t("noResults")}</EmptyState>}
      {patients.length > 0 && (
        <div className="patient-grid">
          <section className="panel" aria-label={t("patients")}>
            {patients.map((patient) => (
              <button key={patient.id} onClick={() => open(patient)} aria-pressed={selected?.id === patient.id} className={`patient-choice${selected?.id === patient.id ? " selected" : ""}`}>
                <Avatar name={patient.nombre} />
                <span className="min-w-0"><span className="block font-semibold truncate">{patient.nombre}</span><span className="block meta truncate">{patient.pais} · <bdi>{patientLanguages[patient.idioma] ?? patient.idioma}</bdi></span></span>
              </button>
            ))}
          </section>
          {!selected ? <section className="panel"><EmptyState>{t("selectPatient")}</EmptyState></section> : (
            <section className="panel">
              <div className="panel-heading patient-heading"><div className="flex items-center gap-3 min-w-0"><Avatar name={selected.nombre} className="avatar-large" /><div className="min-w-0"><h2 className="break-words">{selected.nombre}</h2><p className="meta">{t("patientRecord")}</p></div></div></div>
              <dl className="patient-details">
                <div><dt>{t("language")}</dt><dd><bdi>{patientLanguages[selected.idioma] ?? selected.idioma}</bdi></dd></div>
                <div><dt>{t("country")}</dt><dd>{selected.pais || "—"}</dd></div>
                <div><dt>{t("insurer")}</dt><dd>{selected.aseguradora || "—"}</dd></div>
                <div><dt>{t("email")}</dt><dd dir="ltr">{selected.email || "—"}</dd></div>
                {selected.telefono && <div><dt>{t("phone")}</dt><dd dir="ltr">{selected.telefono}</dd></div>}
              </dl>
              {detailLoading ? <p className="empty-state" role="status">{t("loading")}</p> : (
                <div className="panel-body">
                  <h3 className="mt-1 mb-2">{t("appointments")}</h3>
                  {appointments.length === 0 ? <EmptyState>{t("noAppointments")}</EmptyState> : appointments.map((appointment) => (
                    <article key={appointment.id} className="appointment-row !px-0">
                      <time className="appointment-time" dateTime={appointment.fecha}>{formatDate(appointment.fecha, { day: "numeric", month: "short" })}</time>
                      <div className="flex-1 min-w-0"><p className="font-semibold truncate">{appointment.especialidad}</p><p className="meta truncate">{formatDate(appointment.fecha)} · {appointment.medico}</p></div>
                      <AppointmentStatus status={appointment.estado} />
                    </article>
                  ))}
                  <h3 className="mt-6 mb-2">{t("messages")}</h3><MessageHistory messages={messages} />
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </>
  );
}
