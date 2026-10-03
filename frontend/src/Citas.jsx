import { useState } from "react";
import { apiFetch } from "./apiClient";
import { useLocale } from "./localeContext";
import { useResource } from "./useResource";
import { AppointmentStatus, EmptyState, Notice, PageHeading, ResourceState } from "./Ui";

export default function Citas() {
  const { t, formatDate } = useLocale();
  const [days, setDays] = useState(7);
  const [action, setAction] = useState(null);
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);
  const resource = useResource([`/citas/proximas?dias=${days}`]);

  async function update(appointment, type, value) {
    setSaving(true); setNotice(null);
    try {
      await apiFetch(`/citas/${appointment.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: type, nueva_fecha: type === "reprogramar" ? value.replace("T", " ") : null,
        }),
      });
      setNotice({ tone: "success", key: type === "cancelar" ? "appointmentCancelled" : "appointmentRescheduled" });
      setAction(null); resource.reload();
    } catch {
      setNotice({ tone: "error", key: "actionError" });
      resource.reload();
    } finally {
      setSaving(false);
    }
  }

  const appointments = resource.data?.[0] ?? [];
  return (
    <>
      <PageHeading title={t("appointments")}>
        <label><span className="field-label">{t("appointmentRange")}</span>
          <select className="field" value={days} onChange={(e) => { setDays(Number(e.target.value)); setAction(null); setNotice(null); }}>
            <option value={1}>{t("today")}</option><option value={7}>{t("next7")}</option><option value={30}>{t("next30")}</option>
          </select>
        </label>
      </PageHeading>
      {notice && <div className="mb-5"><Notice tone={notice.tone}>{t(notice.key)}</Notice></div>}
      {(resource.loading || resource.error) ? <ResourceState resource={resource} /> : (
        <section className="panel">
          {appointments.length === 0 ? <EmptyState>{t("noAppointments")}</EmptyState> : appointments.map((appointment) => (
            <article key={appointment.id}>
              <div className="appointment-row">
                <time className="w-36 text-sm text-ink-soft shrink-0" dateTime={appointment.fecha}>{formatDate(appointment.fecha)}</time>
                <div className="flex-1 min-w-[150px]"><p className="font-semibold">{appointment.paciente_nombre}</p><p className="meta">{appointment.especialidad} · {appointment.medico}</p></div>
                <AppointmentStatus status={appointment.estado} />
                {appointment.estado === "programada" && (
                  <div className="flex gap-2 flex-wrap">
                    <button className="button button-secondary" onClick={() => setAction({ id: appointment.id, type: "reprogramar", value: appointment.fecha.slice(0, 16).replace(" ", "T") })}>{t("reschedule")}</button>
                    <button className="button button-danger" onClick={() => setAction({ id: appointment.id, type: "cancelar" })}>{t("cancelAppointment")}</button>
                  </div>
                )}
              </div>
              {action?.id === appointment.id && (
                <div className="action-editor">
                  {action.type === "reprogramar" ? (
                    <label><span className="field-label">{t("newDate")}</span><input className="field" type="datetime-local" value={action.value} onChange={(e) => setAction({ ...action, value: e.target.value })} /></label>
                  ) : <p className="font-semibold flex-1">{t("cancelQuestion")}</p>}
                  <button className={action.type === "cancelar" ? "button button-danger" : "button button-primary"} disabled={saving || !action.value && action.type === "reprogramar"} onClick={() => update(appointment, action.type, action.value)}>
                    {t(saving ? "saving" : action.type === "cancelar" ? "confirmCancel" : "save")}
                  </button>
                  <button className="button button-secondary" disabled={saving} onClick={() => setAction(null)}>{t(action.type === "cancelar" ? "keepAppointment" : "back")}</button>
                </div>
              )}
            </article>
          ))}
        </section>
      )}
    </>
  );
}
