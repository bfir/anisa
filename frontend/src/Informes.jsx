import { useLocale } from "./localeContext";
import { useResource } from "./useResource";
import { EmptyState, PageHeading, ResourceState } from "./Ui";

export default function Informes() {
  const { t, currency, number } = useLocale();
  const resource = useResource(["/citas/proximas?dias=90", "/pagos/pendientes"]);
  if (resource.loading || resource.error) return <ResourceState resource={resource} />;
  const [appointments, payments] = resource.data;
  const specialties = appointments.reduce((result, item) => ({ ...result, [item.especialidad]: (result[item.especialidad] ?? 0) + 1 }), {});
  const total = payments.reduce((sum, item) => sum + item.importe, 0);
  return (
    <>
      <PageHeading title={t("reports")} description={t("reportIntro")} />
      <section className="metric-strip">
        <div className="metric"><p className="metric-label">{t("appointments")}</p><p className="metric-value">{number(appointments.length)}</p></div>
        <div className="metric"><p className="metric-label">{t("outstanding")}</p><p className="metric-value">{number(payments.length)}</p></div>
        <div className="metric"><p className="metric-label">{t("totalOutstanding")}</p><p className="metric-value">{currency(total)}</p></div>
      </section>
      <section className="panel data-table"><div className="panel-heading"><h2>{t("bySpecialty")}</h2></div>
        {Object.keys(specialties).length === 0 ? <EmptyState>{t("noAppointments")}</EmptyState> : <table><thead><tr><th>{t("specialty")}</th><th className="numeric">{t("appointments")}</th></tr></thead><tbody>{Object.entries(specialties).sort((a, b) => b[1] - a[1]).map(([specialty, count]) => <tr key={specialty}><td>{specialty}</td><td className="numeric font-semibold">{number(count)}</td></tr>)}</tbody></table>}
      </section>
    </>
  );
}
