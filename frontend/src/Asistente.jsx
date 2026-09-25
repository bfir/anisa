import { useState } from "react";
import { Send } from "lucide-react";
import { apiFetch } from "./apiClient";

function Asistente() {
  const [historial, setHistorial] = useState([]);
  const [pregunta, setPregunta] = useState("");
  const [cargando, setCargando] = useState(false);

  async function enviar(evento) {
    evento.preventDefault();
    if (!pregunta.trim() || cargando) return;

    const miPregunta = pregunta;
    setHistorial((h) => [...h, { rol: "usuario", texto: miPregunta }]);
    setPregunta("");
    setCargando(true);

    try {
      const respuesta = await apiFetch("/agente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta: miPregunta }),
      });
      setHistorial((h) => [
        ...h,
        { rol: "asistente", texto: respuesta.respuesta, pasos: respuesta.pasos },
      ]);
    } catch (error) {
      setHistorial((h) => [
        ...h,
        { rol: "asistente", texto: "No he podido procesar la pregunta. Inténtalo de nuevo." },
      ]);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-4rem)]">
      <h1 className="font-display text-2xl mb-4">Asistente Anisa</h1>

      <div className="flex-1 overflow-auto space-y-4 pr-1">
        {historial.length === 0 && (
          <p className="text-ink-soft text-sm">
            Pregúntale algo, por ejemplo: "¿qué pagos están pendientes?"
          </p>
        )}
        {historial.map((turno, i) => (
          <div key={i} className={turno.rol === "usuario" ? "text-right" : ""}>
            <div
              className={`inline-block rounded-2xl px-4 py-2 max-w-[85%] text-sm text-left ${
                turno.rol === "usuario"
                  ? "bg-accent text-white"
                  : "bg-surface border border-hairline"
              }`}
            >
              {turno.texto}
            </div>
            {turno.pasos && turno.pasos.length > 0 && (
              <details className="text-xs text-ink-soft mt-1 text-left">
                <summary className="cursor-pointer">Ver {turno.pasos.length} paso(s)</summary>
                <ul className="mt-1 space-y-1">
                  {turno.pasos.map((paso, j) => (
                    <li key={j}>
                      🔧 <strong>{paso.herramienta}</strong>({JSON.stringify(paso.argumentos)})
                      {paso.error && <span className="text-red-ink"> · falló: {paso.error}</span>}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ))}
        {cargando && <p className="text-ink-soft text-sm">Anisa está pensando...</p>}
      </div>

      <form onSubmit={enviar} className="flex gap-2 pt-4 border-t border-hairline mt-4">
        <input
          type="text"
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          placeholder="Pregunta al asistente..."
          className="flex-1 border border-hairline rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          type="submit"
          className="bg-accent text-white px-4 py-2 rounded-lg hover:opacity-90 transition"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

export default Asistente;
