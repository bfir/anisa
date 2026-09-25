import { useState, useEffect } from "react";
import { apiFetch } from "./apiClient";

function Auditoria() {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    apiFetch("/auditoria")
      .then(setRegistros)
      .finally(() => setCargando(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Auditoría del asistente</h1>
        <p className="text-xs text-ink-soft mt-1 max-w-2xl">
          Cada pregunta hecha al asistente queda registrada aquí: quién la hizo, qué herramientas
          ejecutó y qué respondió. Es un registro permanente, no solo la traza de la conversación.
        </p>
      </div>

      {cargando && <p className="text-sm text-ink-soft">Cargando...</p>}
      {!cargando && registros.length === 0 && (
        <p className="text-sm text-ink-soft">Todavía no se ha usado el asistente.</p>
      )}

      <div className="bg-surface border border-hairline rounded-2xl divide-y divide-hairline">
        {registros.map((r) => (
          <div key={r.id} className="p-4 space-y-2">
            <div className="flex justify-between items-center flex-wrap gap-2 text-xs text-ink-soft">
              <span>
                {r.creado_en} · {r.usuario_nombre || "usuario desconocido"}
              </span>
              {r.pasos.length > 0 && (
                <span>
                  {r.pasos.length} herramienta(s){" "}
                  {r.pasos.some((p) => p.error) && (
                    <span className="text-red-ink font-medium">· con errores</span>
                  )}
                </span>
              )}
            </div>
            <p className="text-sm font-medium">{r.pregunta}</p>
            <p className="text-sm text-ink-soft">{r.respuesta}</p>
            {r.pasos.length > 0 && (
              <details className="text-xs text-ink-soft">
                <summary className="cursor-pointer">Ver herramientas ejecutadas</summary>
                <ul className="mt-1 space-y-1">
                  {r.pasos.map((paso, i) => (
                    <li key={i}>
                      🔧 <strong>{paso.herramienta}</strong>({JSON.stringify(paso.argumentos)})
                      {paso.error ? (
                        <span className="text-red-ink"> → error: {paso.error}</span>
                      ) : (
                        <span> → {JSON.stringify(paso.resultado)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Auditoria;
