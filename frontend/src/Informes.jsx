import { useState, useEffect } from "react";
import { apiFetch } from "./apiClient";

function Informes() {
  const [citas, setCitas] = useState([]);
  const [pagos, setPagos] = useState([]);

  useEffect(() => {
    apiFetch("/citas/proximas?dias=90").then(setCitas);
    apiFetch("/pagos/pendientes").then(setPagos);
  }, []);

  const porEspecialidad = citas.reduce((acumulado, cita) => {
    acumulado[cita.especialidad] = (acumulado[cita.especialidad] || 0) + 1;
    return acumulado;
  }, {});
  const maxEspecialidad = Math.max(...Object.values(porEspecialidad), 1);

  const totalPendiente = pagos.reduce((suma, p) => suma + p.importe, 0);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl">Informes</h1>
      <p className="text-xs text-ink-soft max-w-2xl">
        Calculado a partir de las citas de los próximos 90 días y los pagos pendientes actuales de
        la base de datos — no es un cierre contable, es un resumen en vivo de los datos de la demo.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface border border-hairline rounded-2xl p-4">
          <h2 className="font-display text-lg mb-4">Citas por especialidad</h2>
          {Object.keys(porEspecialidad).length === 0 && (
            <p className="text-sm text-ink-soft">Sin citas en este periodo.</p>
          )}
          <div className="space-y-2">
            {Object.entries(porEspecialidad).map(([especialidad, total]) => (
              <div key={especialidad}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{especialidad}</span>
                  <span className="text-ink-soft">{total}</span>
                </div>
                <div className="h-2 bg-hairline rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${(total / maxEspecialidad) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-hairline rounded-2xl p-4">
          <h2 className="font-display text-lg mb-4">Pagos pendientes</h2>
          <p className="font-display text-3xl">
            {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
              totalPendiente
            )}
          </p>
          <p className="text-sm text-ink-soft mt-1">en {pagos.length} facturas sin cobrar</p>
        </div>
      </div>
    </div>
  );
}

export default Informes;
