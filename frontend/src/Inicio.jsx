import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, ChevronRight, Clock3, CreditCard, RefreshCw, Search, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useUsuario } from "./usuarioContext";
import { useLocale } from "./localeContext";
import { useResource } from "./useResource";
import { AppointmentStatus, Avatar, EmptyState, ResourceState } from "./Ui";
import "./operations.css";

function Summary({ icon: Icon, label, value, note, to }) {
  return (
    <Link to={to} className="operations-summary">
      <span className="summary-label"><Icon size={16} aria-hidden="true" />{label}<ArrowRight className="direction-arrow" size={15} aria-hidden="true" /></span>
      <strong>{value}</strong>
      <span className="summary-note">{note}</span>
    </Link>
  );
}

export default function Inicio() {
  const user = useUsuario();
  const { t, formatDate, currency, number, locale } = useLocale();
  const resource = useResource(["/citas/proximas?dias=7", "/pagos/pendientes"]);
  const canAct = user?.rol === "admin" || user?.rol === "coordinador";
  const proposals = useResource(canAct ? ["/agente/acciones"] : []);
  const [day, setDay] = useState("today");
  const [query, setQuery] = useState("");
  const [appointmentId, setAppointmentId] = useState(null);
  const hour = new Date().getHours();
  const greeting = t(hour < 12 ? "morning" : hour < 20 ? "afternoon" : "evening");
  const days = Array.from({ length: 7 }, (_, index) => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    value.setDate(value.getDate() + index);
    const key = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
    return { value, key };
  });
  const [upcoming, payments] = resource.data ?? [[], []];
  const week = upcoming.filter((item) => item.fecha.slice(0, 10) <= days[6].key);
  const total = payments.reduce((sum, payment) => sum + payment.importe, 0);
  const patients = new Set(week.map((item) => item.paciente_id));
  const selectedDay = day === "today" ? days[0].key : day;
  const search = query.trim().toLocaleLowerCase(locale);
  const visibleAppointments = week.filter((item) =>
    (!selectedDay || item.fecha.startsWith(selectedDay)) &&
    `${item.paciente_nombre} ${item.especialidad} ${item.medico}`.toLocaleLowerCase(locale).includes(search),
  );
  const appointment = visibleAppointments.find((item) => item.id === appointmentId) ?? visibleAppointments[0];
  const activeProposals = proposals.data?.[0] ?? [];

  function selectDay(value) {
    setDay(value);
    setAppointmentId(null);
  }

  function clearFilters() {
    selectDay(null);
    setQuery("");
  }

  return (
    <div className="operations-page">
      <header className="operations-heading">
        <div>
          <h1>{t("coordinationCenter")}</h1>
          <p>{greeting}, {user?.nombre?.split(" ")[0] ?? "…"}.</p>
        </div>
        <div className="operations-heading-actions">
          <button className="button button-secondary refresh-data" aria-label={t("retry")} disabled={resource.loading || proposals.loading} onClick={() => { resource.reload(); proposals.reload(); }}><RefreshCw size={16} aria-hidden="true" /></button>
          <Link to="/asistente" className="button button-primary"><Sparkles size={16} aria-hidden="true" />{t("askAssistant")}<ArrowRight className="direction-arrow" size={16} aria-hidden="true" /></Link>
        </div>
      </header>

      {resource.loading || resource.error ? <ResourceState resource={resource} /> : (
        <>
          <section className={`operations-summaries${canAct ? "" : " summaries-reader"}`} aria-label={t("daySummary")}>
            <Summary icon={CalendarDays} label={t("todayAppointments")} value={number(week.filter((item) => item.fecha.startsWith(days[0].key)).length)} note={formatDate(days[0].key, { day: "numeric", month: "long" })} to="/citas" />
            <Summary icon={Users} label={t("patients")} value={number(patients.size)} note={t("visitsNext7")} to="/pacientes" />
            <Summary icon={CreditCard} label={t("totalOutstanding")} value={currency(total)} note={t("paymentCount", { count: number(payments.length) })} to="/pagos" />
            {canAct && <Summary icon={ShieldCheck} label={t("actionsToReview")} value={proposals.loading || proposals.error ? "—" : number(activeProposals.length)} note={t(proposals.loading ? "loading" : proposals.error ? "actionsUnavailable" : "yourProposals")} to="/asistente" />}
          </section>

          <div className="operations-workspace">
            <section className="panel operations-agenda" aria-labelledby="agenda-title">
              <header className="agenda-heading">
                <div><h2 id="agenda-title">{t("teamSchedule")}</h2><p>{formatDate(days[0].key, { day: "numeric", month: "short" })} – {formatDate(days[6].key, { day: "numeric", month: "short", year: "numeric" })}</p></div>
                <Link to="/citas" className="text-link">{t("viewAppointments")}<ArrowRight className="direction-arrow" size={16} aria-hidden="true" /></Link>
              </header>
              <div className="operations-days" role="group" aria-label={t("filterDay")}>
                {days.map(({ value, key }, index) => (
                  <button key={key} onClick={() => selectDay(key)} aria-pressed={selectedDay === key} aria-controls="agenda-rows" className={index === 0 ? "today" : ""}>
                    <span>{new Intl.DateTimeFormat(locale, { weekday: "short" }).format(value)}</span>
                    <time dateTime={key} aria-current={index === 0 ? "date" : undefined}>{number(value.getDate())}</time>
                    <span className="day-volume">{number(week.filter((item) => item.fecha.startsWith(key)).length)}<span className="sr-only"> {t("appointments")}</span></span>
                  </button>
                ))}
              </div>
              <div className="agenda-filters">
                <div className="schedule-range" role="group" aria-label={t("appointmentRange")}>
                  <button aria-pressed={selectedDay === days[0].key} aria-controls="agenda-rows" onClick={() => selectDay("today")}>{t("today")}</button>
                  <button aria-pressed={day === null} aria-controls="agenda-rows" onClick={() => selectDay(null)}>{t("next7")}</button>
                </div>
                <label className="schedule-search">
                  <span className="sr-only">{t("searchScheduleLabel")}</span>
                  <Search size={15} aria-hidden="true" />
                  <input className="field" type="search" value={query} placeholder={t("searchSchedule")} onChange={(event) => { setQuery(event.target.value); setAppointmentId(null); }} />
                </label>
              </div>
              <div id="agenda-rows" className="agenda-rows">
                <div className="agenda-columns" aria-hidden="true"><span>{t("time")}</span><span>{t("patient")}</span><span>{t("status")}</span><span /></div>
                {visibleAppointments.length === 0 ? (
                  <div className="schedule-empty"><CalendarDays size={26} strokeWidth={1.5} aria-hidden="true" /><EmptyState>{t(search ? "noResults" : "noAppointments")}</EmptyState>{week.length > 0 && <button className="text-link" onClick={clearFilters}>{t("showWeek")}<ArrowRight className="direction-arrow" size={15} aria-hidden="true" /></button>}</div>
                ) : visibleAppointments.map((item) => (
                  <button className="operations-appointment" key={item.id} onClick={() => setAppointmentId(item.id)} aria-pressed={appointment?.id === item.id} aria-controls="appointment-detail">
                    <span className="appointment-slot"><time dateTime={item.fecha}>{formatDate(item.fecha, { hour: "2-digit", minute: "2-digit" })}</time><span className="meta">{formatDate(item.fecha, { day: "numeric", month: "short" })}</span></span>
                    <span className="appointment-person"><Avatar name={item.paciente_nombre} /><span><strong dir="auto">{item.paciente_nombre}</strong><span>{item.especialidad} · {item.medico}</span></span></span>
                    <AppointmentStatus status={item.estado} /><ChevronRight className="direction-arrow" size={16} aria-hidden="true" />
                  </button>
                ))}
              </div>
              <footer className="agenda-footer"><span>{t("appointmentCount", { count: number(visibleAppointments.length) })}</span><span>{t("selectAppointmentHint")}</span></footer>
            </section>

            <aside id="appointment-detail" className="panel appointment-detail" aria-labelledby="detail-title">
              <header><h2 id="detail-title">{t("appointmentDetails")}</h2><CalendarDays size={17} aria-hidden="true" /></header>
              <div className="appointment-detail-content" aria-live="polite">
                {appointment ? (
                  <>
                    <div className="detail-patient"><Avatar name={appointment.paciente_nombre} className="avatar-large" /><h3 dir="auto">{appointment.paciente_nombre}</h3><p>{t("patient")} <bdi>#{number(appointment.paciente_id)}</bdi></p><AppointmentStatus status={appointment.estado} /></div>
                    <dl className="detail-fields">
                      <div><dt><Clock3 size={15} aria-hidden="true" />{t("appointmentDate")}</dt><dd>{formatDate(appointment.fecha)}</dd></div>
                      <div><dt>{t("specialty")}</dt><dd dir="auto">{appointment.especialidad}</dd></div>
                      <div><dt>{t("doctor")}</dt><dd dir="auto">{appointment.medico}</dd></div>
                    </dl>
                    <Link to="/citas" className="button button-secondary">{t("manageAppointments")}<ArrowRight className="direction-arrow" size={16} aria-hidden="true" /></Link>
                  </>
                ) : <EmptyState>{t("selectAppointmentHint")}</EmptyState>}
              </div>
              <div className="detail-assistant"><Sparkles size={18} aria-hidden="true" /><div><h3>{t("assistantTitle")}</h3><p>{t("coordinationHelp")}</p><Link to="/asistente" className="text-link">{t("askAssistant")}<ArrowRight className="direction-arrow" size={15} aria-hidden="true" /></Link></div></div>
            </aside>
          </div>

          <div className="operations-followup">
            <section className="panel followup-payments" aria-labelledby="payments-title">
              <header className="followup-heading"><div><h2 id="payments-title">{t("outstanding")}</h2><p>{t("paymentCount", { count: number(payments.length) })}</p></div><Link to="/pagos" className="text-link">{t("allPayments")}<ArrowRight className="direction-arrow" size={15} aria-hidden="true" /></Link></header>
              {payments.length === 0 ? <EmptyState>{t("noPayments")}</EmptyState> : payments.slice(0, 3).map((payment) => (
                <Link key={payment.id} to="/pagos" className="followup-row"><Avatar name={payment.paciente_nombre} /><span className="followup-person"><strong dir="auto">{payment.paciente_nombre}</strong><span dir="auto">{payment.concepto}</span></span><span className="payment-amount">{currency(payment.importe)}</span><ChevronRight className="direction-arrow" size={15} aria-hidden="true" /></Link>
              ))}
            </section>
            <section className="panel followup-proposals" aria-labelledby="proposals-title">
              <header className="followup-heading"><div><h2 id="proposals-title">{t("actionsToReview")}</h2><p>{t("humanApproval")}</p></div><ShieldCheck size={20} aria-hidden="true" /></header>
              {canAct ? (
                <>
                  <ResourceState resource={proposals} />
                  {!proposals.loading && !proposals.error && (activeProposals.length === 0 ? <div className="proposals-empty"><ShieldCheck size={25} strokeWidth={1.5} aria-hidden="true" /><div><h3>{t("noActionsTitle")}</h3><p>{t("noActionsIntro")}</p></div></div> : activeProposals.slice(0, 3).map((action) => (
                    <Link to="/asistente" className="followup-row" key={action.id}><Avatar name={action.paciente.nombre} /><span className="followup-person"><strong dir="auto">{action.paciente.nombre}</strong><span>{t(action.herramienta === "enviar_mensaje" ? "sendMessage" : action.argumentos.accion === "cancelar" ? "cancelAppointment" : "reschedule")}</span><span className="proposal-state">{t(action.estado === "en_curso" ? "approval_en_curso" : "approval_pendiente")}</span></span><ChevronRight className="direction-arrow" size={15} aria-hidden="true" /></Link>
                  )))}
                </>
              ) : <EmptyState>{t("readOnlyProposals")}</EmptyState>}
              <footer className="followup-footer"><Link to="/asistente" className="text-link">{t("reviewActions")}<ArrowRight className="direction-arrow" size={15} aria-hidden="true" /></Link><span>{t("yourProposals")}</span></footer>
            </section>
          </div>
          <p className="operations-footnote"><ShieldCheck size={14} aria-hidden="true" />{t("demoNote")}</p>
        </>
      )}
    </div>
  );
}
