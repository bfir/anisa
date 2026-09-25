import { useState, useEffect } from "react";
import { apiFetch } from "./apiClient";

function euros(numero) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(numero);
}

function Pagos() {
  const [pagos, setPagos] = useState([]);

  useEffect(() => {
    apiFetch("/pagos/pendientes").then(setPagos);
  }, []);

  const total = pagos.reduce((suma, p) => suma + p.importe, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="font-display text-2xl">Pagos pendientes</h1>
        <p className="text-ink-soft text-sm">
          {pagos.length} pagos ·{" "}
          <span className="font-display text-lg text-ink">{euros(total)}</span> por cobrar
        </p>
      </div>

      <div className="bg-surface border border-hairline rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-soft border-b border-hairline">
              <th className="p-3 font-medium">Paciente</th>
              <th className="p-3 font-medium">Concepto</th>
              <th className="p-3 font-medium">Emisión</th>
              <th className="p-3 font-medium text-right">Importe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {pagos.map((p) => (
              <tr key={p.id}>
                <td className="p-3 font-medium whitespace-nowrap">{p.paciente_nombre}</td>
                <td className="p-3 text-ink-soft whitespace-nowrap">{p.concepto}</td>
                <td className="p-3 text-ink-soft whitespace-nowrap">{p.fecha_emision}</td>
                <td className="p-3 text-right whitespace-nowrap">{euros(p.importe)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {pagos.length === 0 && <p className="text-ink-soft text-sm p-4">No hay pagos pendientes.</p>}
      </div>
    </div>
  );
}

export default Pagos;
