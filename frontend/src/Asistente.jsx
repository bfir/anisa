import { useState } from "react";
import { ArrowRight, Send } from "lucide-react";
import { apiFetch } from "./apiClient";
import { useLocale } from "./localeContext";
import { Brand } from "./Ui";

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
  const { t, language } = useLocale();
  const [history, setHistory] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const prompts = ["questionPayments", "questionAppointments", "questionDocs"];

  async function send(event, suggestion) {
    event?.preventDefault();
    const nextQuestion = (suggestion ?? question).trim();
    if (!nextQuestion || loading) return;
    setHistory((items) => [...items, { role: "user", text: nextQuestion }]); setQuestion(""); setLoading(true);
    try {
      const response = await apiFetch("/agente", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta: nextQuestion, idioma: language }),
      });
      setHistory((items) => [...items, {
        role: "assistant", text: response.respuesta, steps: response.pasos,
        error: response.error || response.pasos?.some((step) => step.error),
      }]);
    } catch {
      setHistory((items) => [...items, { role: "assistant", text: t("assistantError"), error: true }]);
    } finally { setLoading(false); }
  }

  return (
    <div className="assistant-page">
      <div className="conversation" aria-live="polite">
        {history.length === 0 && (
          <section className="assistant-welcome">
            <Brand /><h2>{t("assistantTitle")}</h2><p>{t("assistantSummary")}</p>
            <div className="prompt-list">{prompts.map((key) => <button className="prompt-choice" key={key} onClick={() => send(null, t(key))}><span>{t(key)}</span><ArrowRight className="direction-arrow shrink-0" size={16} aria-hidden="true" /></button>)}</div>
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
        <div className="composer-row"><label className="flex-1"><span className="sr-only">{t("askLabel")}</span><textarea rows={1} className="field" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={t("askPlaceholder")} dir="auto" /></label><button className="button button-primary" disabled={loading || !question.trim()}><Send size={17} aria-hidden="true" /><span>{t("sendQuestion")}</span></button></div>
        <p className="meta">{t("assistantNote")}</p>
      </form>
    </div>
  );
}
