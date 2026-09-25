const NOMBRES_DIAS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

function inicioDeSemana(fecha) {
  const copia = new Date(fecha);
  const diaSemana = (copia.getDay() + 6) % 7; // lunes = 0
  copia.setDate(copia.getDate() - diaSemana);
  return copia;
}

function WeeklyOccupancy({ citas }) {
  const hoy = new Date();
  const lunes = inicioDeSemana(hoy);

  const dias = Array.from({ length: 7 }, (_, i) => {
    const fecha = new Date(lunes);
    fecha.setDate(lunes.getDate() + i);
    return fecha;
  });

  const conteos = dias.map((fecha) => {
    const clave = fecha.toISOString().slice(0, 10);
    return citas.filter((c) => c.fecha.startsWith(clave)).length;
  });
  const maxConteo = Math.max(...conteos, 1);

  return (
    <div className="mt-4 pt-4 border-t border-hairline">
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs font-semibold tracking-widest text-ink-soft">
          OCUPACIÓN DE LA SEMANA
        </p>
        <p className="text-xs text-ink-soft">
          {dias[0].getDate()} – {dias[6].getDate()}{" "}
          {dias[6].toLocaleDateString("es-ES", { month: "short" })}
        </p>
      </div>
      <div className="flex justify-between gap-2">
        {dias.map((fecha, i) => {
          const esHoy = fecha.toDateString() === hoy.toDateString();
          const esFinde = i >= 5;
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <div className="h-10 flex items-end">
                <div
                  className={`w-2 rounded-full ${
                    esHoy ? "bg-accent" : esFinde ? "bg-hairline" : "bg-ink-soft"
                  }`}
                  style={{ height: `${Math.max((conteos[i] / maxConteo) * 40, 4)}px` }}
                />
              </div>
              <p className={`text-xs ${esHoy ? "text-accent font-semibold" : "text-ink-soft"}`}>
                {NOMBRES_DIAS[i]}
              </p>
              <p className={`text-xs ${esHoy ? "text-accent font-semibold" : "text-ink-soft"}`}>
                {fecha.getDate()}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WeeklyOccupancy;
