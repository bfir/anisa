import Sparkline from "./Sparkline";

function KpiCard({ icono: Icono, etiqueta, valor, delta, deltaTono = "success", datos, sintetico = false }) {
  const tonos = {
    success: "bg-success-bg text-success-ink",
    neutral: "bg-hairline text-ink-soft",
  };
  return (
    <div className="bg-surface border border-hairline rounded-2xl p-4 space-y-2">
      <div className="flex items-center gap-2 text-ink-soft text-sm">
        <Icono size={16} />
        {etiqueta}
        {sintetico && (
          <span
            title="Dato de ejemplo: la API todavía no expone esta métrica"
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-hairline text-ink-soft"
          >
            ejemplo
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <p className="font-display text-2xl">{valor}</p>
        {delta && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tonos[deltaTono]}`}>
            {delta}
          </span>
        )}
      </div>
      <Sparkline datos={datos} />
    </div>
  );
}

export default KpiCard;
