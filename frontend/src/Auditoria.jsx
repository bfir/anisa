import { useLocale } from "./localeContext";
import { useResource } from "./useResource";
import { EmptyState, PageHeading, ResourceState } from "./Ui";

export default function Auditoria() {
  const { t, formatDate } = useLocale();
  const resource = useResource(["/auditoria"]);
  if (resource.loading || resource.error) return <><PageHeading title={t("audit")} description={t("auditIntro")} /><ResourceState resource={resource} /></>;
  const records = resource.data[0];
  return (
    <>
      <PageHeading title={t("audit")} description={t("auditIntro")} />
      <section className="panel">
        {records.length === 0 ? <EmptyState>{t("noAudit")}</EmptyState> : records.map((record) => (
          <article key={record.id} className="audit-entry">
            <p className="meta">{formatDate(record.creado_en)} · {record.usuario_nombre || t("unknownUser")}</p>
            <h2 className="mt-2" dir="auto">{record.pregunta}</h2>
            <p className="chat-text muted" dir="auto">{record.respuesta}</p>
            {record.pasos.length > 0 && <details className="tool-details"><summary>{t("toolSteps", { count: record.pasos.length })}</summary><ul>{record.pasos.map((step, index) => <li key={index}><strong>{step.herramienta}</strong>{step.error && <span className="text-red-ink"> · {t("toolError")}</span>}</li>)}</ul></details>}
          </article>
        ))}
      </section>
    </>
  );
}
