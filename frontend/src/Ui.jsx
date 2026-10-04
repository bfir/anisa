import { AlertCircle, Plus, RefreshCw } from "lucide-react";
import { useLocale } from "./localeContext";
import { patientLanguages } from "./translations";

export function Brand() {
  return (
    <div className="brand" aria-label="Anisa" translate="no">
      <span className="brand-mark"><Plus size={23} strokeWidth={2.5} aria-hidden="true" /></span>
      <span className="brand-name">anisa<span className="brand-dot">.</span></span>
    </div>
  );
}

export function Avatar({ name = "", className = "" }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
  return <span className={`avatar ${className}`} aria-hidden="true">{initials}</span>;
}

export function PageHeading({ title, description, children }) {
  return (
    <header className="page-heading">
      <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
      {children}
    </header>
  );
}

export function Notice({ children, tone = "error" }) {
  return (
    <div className={`notice notice-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <AlertCircle size={18} aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

export function ResourceState({ resource }) {
  const { t } = useLocale();
  if (resource.loading) return (
    <div className="loading-state" role="status">
      <p>{t("loading")}</p><p className="muted">{t("coldStart")}</p>
      <div className="loading-lines" aria-hidden="true"><span /><span /><span /></div>
    </div>
  );
  if (resource.error) return (
    <div className="space-y-4">
      <Notice>{t(resource.error.status === 403 ? "accessDenied" : "loadError")}</Notice>
      {resource.error.status !== 403 && (
        <button className="button button-secondary" onClick={resource.reload}>
          <RefreshCw size={16} aria-hidden="true" />{t("retry")}
        </button>
      )}
    </div>
  );
  return null;
}

export function EmptyState({ children }) {
  return <p className="empty-state">{children}</p>;
}

const statusKeys = { programada: "scheduled", completada: "completed", cancelada: "cancelled" };

export function AppointmentStatus({ status }) {
  const { t } = useLocale();
  return <span className={`status status-${status}`}>{statusKeys[status] ? t(statusKeys[status]) : status}</span>;
}

export function MessageHistory({ messages }) {
  const { t, formatDate } = useLocale();
  if (!messages.length) return <EmptyState>{t("noMessages")}</EmptyState>;
  return (
    <div className="message-history">
      {messages.map((message) => (
        <article key={message.id}>
          <p className="message-text" dir={message.idioma === "ar" ? "rtl" : "auto"} lang={message.idioma}>{message.texto}</p>
          <p className="meta">
            {formatDate(message.enviado_en)} · <bdi>{patientLanguages[message.idioma] ?? message.idioma}</bdi> ·{" "}
            <span className={message.estado_envio === "fallido" ? "text-red-ink" : ""}>
              {t(message.estado_envio === "enviado" ? "sent" : message.estado_envio === "fallido" ? "failed" : "unknownDelivery")}
            </span>
          </p>
        </article>
      ))}
    </div>
  );
}
