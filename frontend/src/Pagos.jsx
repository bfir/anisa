import { useLocale } from "./localeContext";
import { useResource } from "./useResource";
import { EmptyState, PageHeading, ResourceState } from "./Ui";

export default function Pagos() {
  const { t, currency, formatDate, number } = useLocale();
  const resource = useResource(["/pagos/pendientes"]);
  if (resource.loading || resource.error) return <ResourceState resource={resource} />;
  const payments = resource.data[0];
  const total = payments.reduce((sum, payment) => sum + payment.importe, 0);
  return (
    <>
      <PageHeading title={t("outstanding")} description={`${t("paymentCount", { count: number(payments.length) })} · ${currency(total)}`} />
      {payments.length === 0 ? <EmptyState>{t("noPayments")}</EmptyState> : <div className="panel data-table"><table><thead><tr><th>{t("patient")}</th><th>{t("concept")}</th><th>{t("issued")}</th><th className="numeric">{t("amount")}</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td className="font-semibold">{payment.paciente_nombre}</td><td>{payment.concepto}</td><td><time dateTime={payment.fecha_emision}>{formatDate(payment.fecha_emision)}</time></td><td className="numeric font-semibold">{currency(payment.importe)}</td></tr>)}</tbody></table></div>}
    </>
  );
}
