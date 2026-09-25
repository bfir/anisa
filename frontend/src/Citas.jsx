import { useState, useEffect } from "react";
import { apiFetch } from "./apiClient";

const textoEstado = { programada: "Confirmada", completada: "Completada", cancelada: "Cancelada" };
const colorEstado = {
  programada: "bg-success-bg text-success-ink",
  completada: "bg-hairline text-ink-soft",
  cancelada: "bg-red-bg text-red-ink",
};

function Citas() {
  const [citas, setCitas] = useState([]);
  const [dias, setDias] = useState(7);
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dias]);

  function cargar() {
    apiFetch(`/citas/proximas?dias=${dias}`).then(setCitas);
  }

  async function cancelar(citaId) {
    await apiFetch(`/citas/${citaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "cancelar" }),
    });
    setAviso("Cita cancelada.");
    cargar();
  }

  async function reprogramar(citaId) {
    const nuevaFecha = window.prompt("Nueva fecha y hora (formato: 2026-10-05 10:30):");
    if (!nuevaFecha) return;
    await apiFetch(`/citas/${citaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "reprogramar", nueva_fecha: nuevaFecha }),
    });
    setAviso("Cita reprogramada.");
    cargar();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="font-display text-2xl">Citas</h1>
        <select
          value={dias}
          onChange={(e) => setDias(Number(e.target.value))}
          className="border border-hairline rounded-lg px-3 py-2 text-sm"
        >
          <option value={1}>Hoy</option>
          <option value={7}>Próximos 7 días</option>
          <option value={30}>Próximos 30 días</option>
        </select>
      </div>

      {aviso && <p className="text-sm text-success-ink">{aviso}</p>}

      <div className="bg-surface border border-hairline rounded-2xl divide-y divide-hairline">
        {citas.length === 0 && (
          <p className="text-ink-soft text-sm p-4">No hay citas en este rango.</p>
        )}
        {citas.map((c) => (
          <div key={c.id} className="flex items-center gap-4 p-4 flex-wrap">
            <div className="w-36 text-sm text-ink-soft shrink-0">{c.fecha}</div>
            <div className="flex-1 min-w-[160px]">
              <p className="font-medium">{c.paciente_nombre}</p>
              <p className="text-xs text-ink-soft">
                {c.especialidad} · {c.medico}
              </p>
            </div>
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${
                colorEstado[c.estado] || "bg-hairline text-ink-soft"
              }`}
            >
              {textoEstado[c.estado] || c.estado}
            </span>
            {c.estado === "programada" && (
              <div className="flex gap-3">
                <button onClick={() => reprogramar(c.id)} className="text-xs font-medium hover:underline">
                  Reprogramar
                </button>
                <button
                  onClick={() => cancelar(c.id)}
                  className="text-xs font-medium text-red-ink hover:underline"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Citas;
