function iniciales(nombre) {
  return nombre
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function euros(numero) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(numero);
}

function PaymentsCard({ pagos }) {
  const total = pagos.reduce((suma, p) => suma + p.importe, 0);

  return (
    <div className="bg-surface border border-hairline rounded-2xl p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-display text-lg flex items-center gap-2">
          Pagos pendientes
          <span className="text-xs bg-hairline text-ink-soft rounded-full px-2 py-0.5">
            {pagos.length}
          </span>
        </h2>
        <button className="text-sm font-medium hover:underline">Todos →</button>
      </div>

      <div className="divide-y divide-hairline">
        {pagos.slice(0, 5).map((pago) => {
          // La API no guarda nº de factura ni fecha de vencimiento reales:
          // se derivan aquí solo para la demo visual (id -> nº de factura,
          // fecha_emision + 30 días -> vencimiento). No son datos reales de facturación.
          const vencimiento = new Date(pago.fecha_emision);
          vencimiento.setDate(vencimiento.getDate() + 30);
          return (
            <div key={pago.id} className="flex items-center gap-3 py-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-bg text-blue-ink flex items-center justify-center text-xs font-semibold shrink-0">
                {iniciales(pago.paciente_nombre || "??")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{pago.paciente_nombre}</p>
                <p className="text-xs text-ink-soft truncate">
                  Factura #2026-{pago.id} · vence{" "}
                  {vencimiento.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                </p>
              </div>
              <p className="text-sm font-medium shrink-0">{euros(pago.importe)}</p>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center pt-3 mt-1 border-t border-hairline">
        <p className="text-sm text-ink-soft">Total por cobrar</p>
        <p className="font-display text-lg">{euros(total)}</p>
      </div>
    </div>
  );
}

export default PaymentsCard;
