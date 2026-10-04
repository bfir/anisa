import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, ChevronRight, CreditCard, Layers3, List, RefreshCw, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useUsuario } from "./usuarioContext";
import { useLocale } from "./localeContext";
import { useResource } from "./useResource";
import { AppointmentStatus, Avatar, EmptyState, Notice, ResourceState } from "./Ui";
import CampusScene from "./CampusScene";
import "./operations.css";

export default function Inicio() {
  const user = useUsuario();
  const { t, formatDate, currency, number, locale } = useLocale();
  const resource = useResource(["/citas/proximas?dias=1", "/citas/proximas?dias=7", "/pagos/pendientes"]);
  const canAct = user?.rol === "admin" || user?.rol === "coordinador";
  const proposals = useResource(canAct ? ["/agente/acciones"] : []);
  const [selected, setSelected] = useState("appointments");
  const [view, setView] = useState("map");
  const [day, setDay] = useState(null);
  const [appointmentId, setAppointmentId] = useState(null);
  if (resource.loading || resource.error) return <ResourceState resource={resource} />;

  const [next, week, payments] = resource.data;
  const patients = [...new Map(week.map((item) => [item.paciente_id, item])).values()];
  const total = payments.reduce((sum, payment) => sum + payment.importe, 0);
  const hour = new Date().getHours();
  const greeting = t(hour < 12 ? "morning" : hour < 20 ? "afternoon" : "evening");
  const date = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const days = Array.from({ length: 7 }, (_, index) => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    value.setDate(value.getDate() + index);
    const key = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
    return { value, key, count: week.filter((item) => item.fecha.startsWith(key)).length };
  });
  const activeProposals = proposals.data?.[0] ?? [];
  const zones = [
    { id: "appointments", label: t("appointments"), value: week.length, icon: CalendarDays },
    { id: "patients", label: t("patients"), value: patients.length, icon: Users },
    { id: "payments", label: t("payments"), value: payments.length, icon: CreditCard },
    { id: "assistant", label: t("assistant"), value: canAct && !proposals.loading && !proposals.error ? activeProposals.length : null, icon: Sparkles },
  ];
  const zone = zones.find((item) => item.id === selected);
  const ZoneIcon = zone.icon;
  const visibleAppointments = day ? week.filter((item) => item.fecha.startsWith(day)) : next;
  const appointment = visibleAppointments.find((item) => item.id === appointmentId) ?? visibleAppointments[0];
  const contextTitles = { appointments: "scheduleOverview", patients: "patientCoordination", payments: "paymentCoordination", assistant: "assistantCoordination" };
  const contextNotes = { appointments: "weekAppointments", patients: "patientsWithVisit", payments: "outstanding", assistant: "reviewActions" };

  return (
    <div className="operations-page">
      <header className="operations-heading">
        <div>
          <h1>{t("coordinationCenter")}</h1>
          <p>{greeting}, {user?.nombre?.split(" ")[0] ?? "…"}.<span className="heading-date">{date}</span></p>
        </div>
        <div className="operations-heading-actions">
          <button className="button button-secondary refresh-data" aria-label={t("retry")} onClick={() => { resource.reload(); proposals.reload(); }}><RefreshCw size={16} aria-hidden="true" /></button>
          <Link to="/asistente" className="button button-primary"><Sparkles size={16} aria-hidden="true" />{t("askAssistant")}<ArrowRight className="direction-arrow" size={16} aria-hidden="true" /></Link>
        </div>
      </header>

      <section className="operations-metrics" aria-label={t("daySummary")}>
        <div className="operations-metric"><span className="metric-symbol"><CalendarDays size={19} aria-hidden="true" /></span><div><p>{t("todayAppointments")}</p><strong>{number(days[0].count)}</strong></div><Link to="/citas" aria-label={t("viewAppointments")}><ArrowRight className="direction-arrow" size={18} aria-hidden="true" /></Link></div>
        <div className="operations-metric"><span className="metric-symbol"><Users size={19} aria-hidden="true" /></span><div><p>{t("patientsWithVisit")}</p><strong>{number(patients.length)}</strong></div><Link to="/pacientes" aria-label={t("viewPatients")}><ArrowRight className="direction-arrow" size={18} aria-hidden="true" /></Link></div>
        <div className="operations-metric"><span className="metric-symbol payment-symbol"><CreditCard size={19} aria-hidden="true" /></span><div><p>{t("totalOutstanding")}</p><strong>{currency(total)}</strong></div><Link to="/pagos" aria-label={t("reviewPayments")}><ArrowRight className="direction-arrow" size={18} aria-hidden="true" /></Link></div>
      </section>

      <div className="operations-workspace">
        <section className="operations-map" aria-labelledby="operations-map-title">
          <div className="map-toolbar">
            <div className="section-title"><Layers3 size={18} aria-hidden="true" /><h2 id="operations-map-title">{t("coordinationView")}</h2></div>
            <div className="view-switch" role="group" aria-label={t("dashboardView")}>
              <button aria-pressed={view === "map"} onClick={() => setView("map")}><Layers3 size={15} aria-hidden="true" />{t("map3D")}</button>
              <button aria-pressed={view === "list"} onClick={() => setView("list")}><List size={15} aria-hidden="true" />{t("listView")}</button>
            </div>
          </div>
          {view === "map" ? <CampusScene zones={zones} selected={selected} onSelect={setSelected} /> : (
            <div className="zone-list">
              <p>{t("conceptualMap")}</p>
              {zones.map(({ id, label, value, icon: Icon }) => (
                <button key={id} className={selected === id ? "selected" : ""} onClick={() => setSelected(id)} aria-pressed={selected === id} aria-controls="zone-detail">
                  <Icon size={22} aria-hidden="true" /><span><strong>{label}</strong><small>{t(contextNotes[id])}</small></span><b>{value === null ? "—" : number(value)}</b><ChevronRight className="direction-arrow" size={17} aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
          <div className="map-zone-navigation" role="group" aria-label={t("selectZone")}>
            {zones.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setSelected(id)} aria-pressed={selected === id} aria-controls="zone-detail"><Icon size={14} aria-hidden="true" />{label}</button>)}
          </div>
        </section>

        <aside id="zone-detail" className={`operations-context context-${selected}`} aria-labelledby="context-title">
          <header className="context-heading"><span className="context-icon"><ZoneIcon size={23} strokeWidth={1.5} aria-hidden="true" /></span><p>{zone.label}<span className="context-period">{t(contextNotes[selected])}</span></p></header>
          <h2 id="context-title">{t(contextTitles[selected])}</h2>
          {selected === "appointments" && (
            <>
              <div className="context-value"><strong>{number(week.length)}</strong><span>{t("weekAppointments")}</span></div>
              {appointment ? <div className="context-appointment">
                <div className="context-patient"><Avatar name={appointment.paciente_nombre} /><div><h3 dir="auto">{appointment.paciente_nombre}</h3><p>{appointment.especialidad}</p></div></div>
                <dl><div><dt>{t("appointmentDate")}</dt><dd>{formatDate(appointment.fecha)}</dd></div><div><dt>{t("doctor")}</dt><dd>{appointment.medico}</dd></div><div><dt>{t("status")}</dt><dd><AppointmentStatus status={appointment.estado} /></dd></div></dl>
                <Link to="/citas" className="button button-primary">{t("viewAppointments")}<ArrowRight className="direction-arrow" size={16} aria-hidden="true" /></Link>
              </div> : <EmptyState>{t("noAppointments")}</EmptyState>}
            </>
          )}
          {selected === "patients" && (
            <>
              <div className="context-value"><strong>{number(patients.length)}</strong><span>{t("patientsWithVisit")}</span></div>
              <div className="context-items">{patients.length === 0 ? <EmptyState>{t("noAppointments")}</EmptyState> : patients.slice(0, 4).map((patient) => <article key={patient.paciente_id}><Avatar name={patient.paciente_nombre} /><div><h3 dir="auto">{patient.paciente_nombre}</h3><p>{patient.especialidad}</p></div></article>)}</div>
              <Link to="/pacientes" className="button button-primary">{t("viewPatients")}<ArrowRight className="direction-arrow" size={16} aria-hidden="true" /></Link>
            </>
          )}
          {selected === "payments" && (
            <>
              <div className="context-value context-currency"><strong>{currency(total)}</strong><span>{t("paymentCount", { count: number(payments.length) })}</span></div>
              <div className="context-items">{payments.length === 0 ? <EmptyState>{t("noPayments")}</EmptyState> : payments.slice(0, 3).map((payment) => <article key={payment.id}><div><h3 dir="auto">{payment.paciente_nombre}</h3><p>{payment.concepto}</p><strong className="payment-amount">{currency(payment.importe)}</strong></div></article>)}</div>
              <Link to="/pagos" className="button button-primary">{t("reviewPayments")}<ArrowRight className="direction-arrow" size={16} aria-hidden="true" /></Link>
            </>
          )}
          {selected === "assistant" && (
            <>
              {canAct && <ResourceState resource={proposals} />}
              {!proposals.loading && !proposals.error && canAct && <div className="context-value"><strong>{number(activeProposals.length)}</strong><span>{t("reviewActions")}</span></div>}
              <p className="context-explanation">{t("assistantSummary")}</p>
              <div className="context-items">{activeProposals.slice(0, 2).map((action) => <article key={action.id}><ShieldCheck size={18} aria-hidden="true" /><div><h3 dir="auto">{action.paciente.nombre}</h3><p>{t(action.herramienta === "enviar_mensaje" ? "sendMessage" : action.argumentos.accion === "cancelar" ? "cancelAppointment" : "reschedule")}</p></div></article>)}</div>
              <div className="approval-note"><ShieldCheck size={18} aria-hidden="true" /><p>{t("approvalIntro")}</p></div>
              <Link to="/asistente" className="button button-primary">{t("askAssistant")}<ArrowRight className="direction-arrow" size={16} aria-hidden="true" /></Link>
            </>
          )}
          <div className="context-footer"><ShieldCheck size={14} aria-hidden="true" />{t("demoNote")}</div>
        </aside>
      </div>

      <section className="operations-agenda" aria-labelledby="operations-agenda-title">
        <header className="agenda-heading"><div><h2 id="operations-agenda-title">{t("weekActivity")}</h2><p>{t("appointmentCount", { count: number(week.length) })}</p></div><Link to="/citas" className="text-link">{t("viewAppointments")}<ArrowRight className="direction-arrow" size={16} aria-hidden="true" /></Link></header>
        <div className="operations-days" role="group" aria-label={t("filterDay")}>
          {days.map(({ value, key, count }, index) => <button key={key} onClick={() => { setDay(day === key ? null : key); setAppointmentId(null); }} aria-pressed={day === key} className={`${day === key ? " selected" : ""}${index === 0 ? " today" : ""}`}>
            <span>{new Intl.DateTimeFormat(locale, { weekday: "short" }).format(value)}</span><time dateTime={key} aria-current={index === 0 ? "date" : undefined}>{number(value.getDate())}</time><span className="day-volume">{number(count)}<span className="sr-only"> {t("appointments")}</span></span>
          </button>)}
        </div>
        <div className="agenda-list-heading"><h3>{day ? formatDate(day) : t("nextAppointments")}</h3>{day && <button className="text-link" onClick={() => setDay(null)}>{t("clearFilter")}</button>}</div>
        {visibleAppointments.length === 0 ? <EmptyState>{t("noAppointments")}</EmptyState> : visibleAppointments.map((item) => (
          <button className={`operations-appointment${appointment?.id === item.id && selected === "appointments" ? " selected" : ""}`} key={item.id} onClick={() => { setSelected("appointments"); setAppointmentId(item.id); }}>
            <div className="appointment-slot"><time dateTime={item.fecha}>{formatDate(item.fecha, { hour: "2-digit", minute: "2-digit" })}</time><p className="meta">{formatDate(item.fecha, { day: "numeric", month: "short" })}</p></div>
            <Avatar name={item.paciente_nombre} /><div className="appointment-person"><strong dir="auto">{item.paciente_nombre}</strong><p>{item.especialidad} · {item.medico}</p></div><AppointmentStatus status={item.estado} /><ChevronRight className="direction-arrow" size={17} aria-hidden="true" />
          </button>
        ))}
      </section>
      {proposals.error && selected !== "assistant" && canAct && <Notice tone="warning">{t("actionsUnavailable")} <button className="text-link" onClick={proposals.reload}>{t("retry")}</button></Notice>}
    </div>
  );
}
