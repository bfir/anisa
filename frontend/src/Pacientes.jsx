import { useState } from "react";
import { Search } from "lucide-react";
import { apiFetch } from "./apiClient";

const NOMBRE_IDIOMA = { es: "Español", en: "English", ar: "العربية", fr: "Français" };

function iniciales(nombre) {
  return nombre
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function Pacientes() {
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscado, setBuscado] = useState(false);
  const [seleccionado, setSeleccionado] = useState(null);
  const [citas, setCitas] = useState([]);
  const [mensajes, setMensajes] = useState([]);

  async function buscar(evento) {
    evento.preventDefault();
    const datos = await apiFetch(`/pacientes/buscar?nombre=${encodeURIComponent(busqueda)}`);
    setResultados(datos);
    setBuscado(true);
    setSeleccionado(null);
  }

  function elegir(paciente) {
    setSeleccionado(paciente);
    apiFetch(`/pacientes/${paciente.id}/citas`).then(setCitas);
    apiFetch(`/pacientes/${paciente.id}/mensajes`).then(setMensajes);
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl">Pacientes</h1>

      <form onSubmit={buscar} className="flex gap-2 max-w-lg">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full border border-hairline rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <button className="bg-accent text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition">
          Buscar
        </button>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="bg-surface border border-hairline rounded-2xl divide-y divide-hairline">
          {!buscado && <p className="text-ink-soft text-sm p-4">Escribe un nombre para buscar.</p>}
          {buscado && resultados.length === 0 && (
            <p className="text-ink-soft text-sm p-4">Ningún paciente coincide.</p>
          )}
          {resultados.map((p) => (
            <button
              key={p.id}
              onClick={() => elegir(p)}
              className={`w-full text-left px-4 py-3 hover:bg-bg flex items-center gap-3 ${
                seleccionado?.id === p.id ? "bg-bg" : ""
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-teal-bg text-teal-ink flex items-center justify-center text-xs font-semibold shrink-0">
                {iniciales(p.nombre)}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{p.nombre}</p>
                <p className="text-xs text-ink-soft truncate">{p.pais}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {!seleccionado && (
            <div className="bg-surface border border-hairline rounded-2xl p-8 text-center text-ink-soft text-sm">
              Elige un paciente de la lista para ver su ficha.
            </div>
          )}
          {seleccionado && (
            <>
              <div className="bg-surface border border-hairline rounded-2xl p-4">
                <h2 className="font-display text-lg">{seleccionado.nombre}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
                  <div>
                    <p className="text-xs text-ink-soft">Idioma</p>
                    <p>{NOMBRE_IDIOMA[seleccionado.idioma] || seleccionado.idioma}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-soft">País</p>
                    <p>{seleccionado.pais}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-soft">Aseguradora</p>
                    <p>{seleccionado.aseguradora}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-ink-soft">Email</p>
                    <p className="truncate">{seleccionado.email}</p>
                  </div>
                </div>
              </div>

              <div className="bg-surface border border-hairline rounded-2xl p-4">
                <h3 className="font-medium mb-2">Citas</h3>
                {citas.length === 0 && <p className="text-sm text-ink-soft">Sin citas.</p>}
                <div className="divide-y divide-hairline">
                  {citas.map((c) => (
                    <div key={c.id} className="py-2 flex justify-between text-sm gap-2">
                      <span className="truncate">
                        {c.especialidad} · {c.medico}
                      </span>
                      <span className="text-ink-soft shrink-0">{c.fecha}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-surface border border-hairline rounded-2xl p-4">
                <h3 className="font-medium mb-2">Mensajes</h3>
                {mensajes.length === 0 && <p className="text-sm text-ink-soft">Sin mensajes.</p>}
                <div className="divide-y divide-hairline">
                  {mensajes.map((m) => (
                    <div key={m.id} className="py-2 text-sm">
                      <p>{m.texto}</p>
                      <p className="text-xs text-ink-soft">{m.enviado_en}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Pacientes;
