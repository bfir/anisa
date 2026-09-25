const coloresEstado = {
  programada: "bg-success-bg text-success-ink",
  completada: "bg-hairline text-ink-soft",
  cancelada: "bg-red-bg text-red-ink",
};

const textoEstado = {
  programada: "Confirmada",
  completada: "Completada",
  cancelada: "Cancelada",
};

const coloresAvatar = [
  "bg-teal-bg text-teal-ink",
  "bg-amber-bg text-amber-ink",
  "bg-blue-bg text-blue-ink",
  "bg-success-bg text-success-ink",
];

function iniciales(nombre) {
  return nombre
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function AppointmentsList({ citas }) {
  return (
    <div className="bg-surface border border-hairline rounded-2xl p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-display text-lg flex items-center gap-2">
          Citas de hoy
          <span className="text-xs bg-hairline text-ink-soft rounded-full px-2 py-0.5">
            {citas.length}
          </span>
        </h2>
        <button className="text-sm font-medium hover:underline">Ver agenda →</button>
      </div>

      {citas.length === 0 && (
        <p className="text-ink-soft text-sm">No hay citas programadas para hoy.</p>
      )}

      <div className="divide-y divide-hairline">
        {citas.map((cita, i) => {
          const hora = cita.fecha.split(" ")[1] || "";
          return (
            <div key={cita.id} className="flex items-center gap-3 py-3">
              <div className="w-12 text-sm text-ink-soft shrink-0">{hora}</div>
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                  coloresAvatar[i % coloresAvatar.length]
                }`}
              >
                {iniciales(cita.paciente_nombre || "??")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{cita.paciente_nombre}</p>
                <p className="text-xs text-ink-soft truncate">
                  {cita.especialidad} · {cita.medico}
                </p>
              </div>
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${
                  coloresEstado[cita.estado] || "bg-hairline text-ink-soft"
                }`}
              >
                {textoEstado[cita.estado] || cita.estado}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AppointmentsList;
