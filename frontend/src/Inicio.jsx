import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Search } from "lucide-react";
import { useUsuario } from "./usuarioContext";
import { useLocale } from "./localeContext";
import { useResource } from "./useResource";
import { AppointmentStatus, Avatar, Brand, EmptyState, PageHeading, ResourceState } from "./Ui";

export default function Inicio() {
  const user = useUsuario();
  const { t, formatDate, currency, number, locale } = useLocale();
  const resource = useResource(["/citas/proximas?dias=1", "/citas/proximas?dias=7", "/pagos/pendientes"]);
  if (resource.loading || resource.error) return <ResourceState resource={resource} />;

  const [next, week, payments] = resource.data;
  const total = payments.reduce((sum, payment) => sum + payment.importe, 0);
  const hour = new Date().getHours();
  const greeting = t(hour < 12 ? "morning" : hour < 20 ? "afternoon" : "evening");
  const date = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  const now = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date());
  const days = Array.from({ length: 7 }, (_, index) => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    value.setDate(value.getDate() + index);
    const key = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
    return { value, key, count: week.filter((item) => item.fecha.startsWith(key)).length };
  });

  return (
    <>
      <PageHeading title={`${greeting}, ${user?.nombre?.split(" ")[0] ?? "…"}.`} description={`${date} · ${t("daySummary")}`}>
        <div className="flex gap-2 flex-wrap">
          <Link to="/pacientes" className="button button-secondary"><Search size={16} aria-hidden="true" />{t("viewPatients")}</Link>
          <Link to="/citas" className="button button-primary"><CalendarDays size={16} aria-hidden="true" />{t("viewAppointments")}</Link>
        </div>
      </PageHeading>
      <section className="metric-strip" aria-label={t("daySummary")}>
        <div className="metric"><p className="metric-label">{t("todayAppointments")}</p><p className="metric-value">{number(days[0].count)}</p></div>
        <div className="metric"><p className="metric-label">{t("weekAppointments")}</p><p className="metric-value">{number(week.length)}</p></div>
        <div className="metric"><p className="metric-label">{t("totalOutstanding")}</p><p className="metric-value">{currency(total)}</p><p className="meta">{t("paymentCount", { count: number(payments.length) })}</p></div>
      </section>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading"><div className="section-title"><CalendarDays size={19} strokeWidth={1.8} aria-hidden="true" /><h2>{t("nextAppointments")}</h2></div><Link to="/citas" className="text-link">{t("viewAppointments")}<ArrowRight className="direction-arrow" size={15} aria-hidden="true" /></Link></div>
          {next.length === 0 ? <EmptyState>{t("noTodayAppointments")}</EmptyState> : next.map((appointment) => (
            <article className="appointment-row dashboard-appointment" key={appointment.id}>
              <div className="appointment-slot"><time dateTime={appointment.fecha}>{formatDate(appointment.fecha, { hour: "2-digit", minute: "2-digit" })}</time><p className="meta">{formatDate(appointment.fecha, { day: "numeric", month: "short" })}</p></div>
              <Avatar name={appointment.paciente_nombre} />
              <div className="min-w-0 flex-1"><p className="font-semibold truncate">{appointment.paciente_nombre}</p><p className="meta truncate">{appointment.especialidad} · {appointment.medico}</p></div>
              <AppointmentStatus status={appointment.estado} />
            </article>
          ))}
          <div className="panel-body week-schedule">
            <div className="flex justify-between gap-4"><p className="text-sm font-semibold">{t("weekActivity")}</p><p className="meta">{t("appointmentCount", { count: number(week.length) })}</p></div>
            <div className="week-days">
              {days.map(({ value, key, count }, index) => (
                <div key={key} className={`week-day${index === 0 ? " today" : ""}`}>
                  <p className="meta">{new Intl.DateTimeFormat(locale, { weekday: "short" }).format(value)}</p>
                  <time dateTime={key} aria-current={index === 0 ? "date" : undefined}>{number(value.getDate())}</time><p className="week-count" aria-label={t("appointmentCount", { count: number(count) })}>{number(count)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <div className="space-y-6">
          <section className="panel">
            <div className="panel-heading"><h2>{t("outstanding")}</h2><Link to="/pagos" className="text-link">{t("allPayments")}<ArrowRight className="direction-arrow" size={15} aria-hidden="true" /></Link></div>
            {payments.length === 0 ? <EmptyState>{t("noPayments")}</EmptyState> : payments.slice(0, 4).map((payment) => (
              <article className="appointment-row" key={payment.id}>
                <Avatar name={payment.paciente_nombre} />
                <div className="min-w-0 flex-1"><p className="font-semibold truncate">{payment.paciente_nombre}</p><p className="meta truncate">{payment.concepto}</p></div>
                <p className="font-semibold shrink-0">{currency(payment.importe)}</p>
              </article>
            ))}
          </section>
          <section className="assistant-invitation">
            <Brand /><h2>{t("assistantIntro")}</h2><p>{t("assistantSummary")}</p><Link to="/asistente" className="button">{t("askAssistant")}<ArrowRight className="direction-arrow" size={16} aria-hidden="true" /></Link>
          </section>
        </div>
      </div>
      <p className="meta text-center mt-8">{t("demo")} · {t("updated", { time: now })}</p>
    </>
  );
}
