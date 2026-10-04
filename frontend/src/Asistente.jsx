import { useState } from "react";
import { ArrowRight, BookOpen, CalendarDays, CreditCard, Send } from "lucide-react";
import { apiFetch } from "./apiClient";
import { useLocale } from "./localeContext";
import { useResource } from "./useResource";
import { Brand, Notice, ResourceState } from "./Ui";
import { patientLanguages } from "./translations";

const messageTypeKeys = { recordatorio_cita: "appointmentReminder", pago_pendiente: "paymentReminder", informativo: "informational" };

function inlineMarkdown(text) {
  return text.split(/(\*\*[^*\n]+\*\*|\*[^*\s][^*\n]*?\*|_[^_\s][^_\n]*?_)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) return <em key={index}>{part.slice(1, -1)}</em>;
    return part;
  });
}

function AssistantText({ text }) {
  return text.split("\n").map((line, index) => <span className="block min-h-[1lh]" dir="auto" key={index}>{inlineMarkdown(line)}</span>);
}

export default function Asistente() {
  const { t, language, formatDate } = useLocale();
  const [history, setHistory] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState([]);
  const [deciding, setDeciding] = useState(null);
  const [actionError, setActionError] = useState(null);
  const pending = useResource(["/agente/acciones"]);
  const canAsk = !pending.loading && !pending.error;
  const proposals = [...new Map([...(pending.data?.[0] ?? []), ...actions].map((action) => [action.id, action])).values()];
  const prompts = [
    { key: "questionPayments", icon: CreditCard },
    { key: "questionAppointments", icon: CalendarDays },
    { key: "questionDocs", icon: BookOpen },
  ];

  function remember(action) {
    setActions((items) => [...items.filter((item) => item.id !== action.id), action]);
  }

  async function decide(action, decision) {
    if (deciding !== null) return;
    setDeciding(action.id); setActionError(null);
    try {
      const result = await apiFetch(`/agente/acciones/${action.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      remember(result);
    } catch {
      setActionError(t("actionError"));
      try {
        remember(await apiFetch(`/agente/acciones/${action.id}`));
      } catch {
        remember({ ...action, estado: "en_curso" });
      }
    } finally {
      setDeciding(null);
    }
  }

  async function refresh(action) {
    setDeciding(action.id); setActionError(null);
    try {
      remember(await apiFetch(`/agente/acciones/${action.id}`));
    } catch {
      setActionError(t("actionError"));
    } finally { setDeciding(null); }
  }

  async function send(event, suggestion) {
    event?.preventDefault();
    const nextQuestion = (suggestion ?? question).trim();
    if (!nextQuestion || loading || !canAsk) return;
    setHistory((items) => [...items, { role: "user", text: nextQuestion }]); setQuestion(""); setLoading(true);
    try {
      const response = await apiFetch("/agente", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta: nextQuestion, idioma: language }),
      });
      for (const action of response.acciones ?? []) remember(action);
      setHistory((items) => [...items, {
        role: "assistant", text: response.respuesta, steps: response.pasos,
        error: response.error || response.pasos?.some((step) => step.error),
      }]);
    } catch (error) {
      setHistory((items) => [...items, { role: "assistant", text: t(error.status === 403 ? "accessDenied" : "assistantError"), error: true }]);
    } finally { setLoading(false); }
  }

  return (
    <div className="assistant-page">
      <div className="conversation" aria-live="polite">
        <ResourceState resource={pending} />
        {actionError && <Notice tone="error">{actionError}</Notice>}
        {proposals.length > 0 && (
          <section className="panel" aria-label={t("reviewActions")}>
            <div className="panel-heading"><h2>{t("reviewActions")}</h2></div>
            <div className="panel-body">
              <p className="muted text-sm mb-4">{t("approvalIntro")}</p>
              {proposals.map((action) => {
                const isMessage = action.herramienta === "enviar_mensaje";
                const expired = new Date(`${action.expira_en}Z`) <= new Date();
                const state = action.estado === "pendiente" && expired ? "caducada" : action.estado;
                return (
                  <article key={action.id} className="approval-entry">
                    <h3>{isMessage ? t("sendMessage") : t(action.argumentos.accion === "cancelar" ? "cancelAppointment" : "reschedule")}</h3>
                    <p dir="auto">{action.paciente.nombre} <span className="meta">· ID <bdi>{action.paciente.id}</bdi></span></p>
                    {isMessage ? (
                      <>
                        <p className="meta">{t("email")}: <bdi dir="ltr">{action.paciente.email}</bdi> · {patientLanguages[action.argumentos.idioma]}</p>
                        <p className="meta">{t("messageType")}: {t(messageTypeKeys[action.argumentos.tipo])}</p>
                        <p className="meta">{t("demoEmail")}</p>
                        <p className="message-text" dir={action.argumentos.idioma === "ar" ? "rtl" : "auto"} lang={action.argumentos.idioma}>{action.argumentos.texto}</p>
                      </>
                    ) : (
                      <>
                        <p>{action.cita.especialidad} · {action.cita.medico}</p>
                        <p className="meta">{t("currentAppointment")}: {formatDate(action.cita.fecha)} · ID <bdi>{action.argumentos.cita_id}</bdi></p>
                        {action.argumentos.nueva_fecha && <p>{t("newDate")}: {formatDate(action.argumentos.nueva_fecha)}</p>}
                      </>
                    )}
                    <p role="status" className="meta mt-3">{t(`approval_${state}`)}</p>
                    {state === "pendiente" && (
                      <div className="approval-buttons">
                        <button className="button button-primary" disabled={deciding !== null} onClick={() => decide(action, "aprobar")}>{deciding === action.id ? t("saving") : t("approveAction")}</button>
                        <button className="button button-secondary" disabled={deciding !== null} onClick={() => decide(action, "rechazar")}>{t("discardAction")}</button>
                      </div>
                    )}
                    {state === "en_curso" && <button className="button button-secondary mt-3" disabled={deciding !== null} onClick={() => refresh(action)}>{t("refreshAction")}</button>}
                    {state === "fallida" && <Notice tone="error">{action.resultado?.estado_envio === "fallido" ? t("savedEmailFailed") : t("actionError")}</Notice>}
                  </article>
                );
              })}
            </div>
          </section>
        )}
        {history.length === 0 && (
          <section className="assistant-welcome">
            <Brand /><h1>{t("assistantTitle")}</h1><p>{t("assistantSummary")}</p>
            <div className="prompt-list">{prompts.map(({ key, icon: Icon }) => <button className="prompt-choice" key={key} disabled={loading || !canAsk} onClick={() => send(null, t(key))}><Icon size={19} strokeWidth={1.8} aria-hidden="true" /><span>{t(key)}</span><ArrowRight className="direction-arrow shrink-0" size={16} aria-hidden="true" /></button>)}</div>
          </section>
        )}
        {history.map((turn, index) => (
          <article key={index} className={`chat-turn chat-${turn.role}${turn.error ? " error" : ""}`}>
            <div className="chat-text" lang={turn.role === "assistant" ? language : undefined}><AssistantText text={turn.text} /></div>
            {turn.steps?.length > 0 && <details className="tool-details"><summary>{t("toolSteps", { count: turn.steps.length })}</summary><ul>{turn.steps.map((step, stepIndex) => <li key={stepIndex}><strong>{step.herramienta}</strong>{step.error && <span className="text-red-ink"> · {t("toolError")}</span>}</li>)}</ul></details>}
          </article>
        ))}
        {loading && <p role="status" className="muted text-sm">{t("thinking")}</p>}
      </div>
      <form onSubmit={send} className="composer">
        <div className="composer-row"><label className="flex-1 min-w-0"><span className="sr-only">{t("askLabel")}</span><textarea rows={1} className="field" name="question" autoComplete="off" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={t("askPlaceholder")} dir="auto" disabled={!canAsk} /></label><button className="button button-primary" aria-label={t("sendQuestion")} disabled={loading || !canAsk || !question.trim()}><Send size={17} aria-hidden="true" /><span>{t("sendQuestion")}</span></button></div>
        <p className="meta">{t("assistantNote")}</p>
      </form>
    </div>
  );
}
