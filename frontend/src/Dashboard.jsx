import { useState } from "react";
import { apiFetch } from "./apiClient";

function Dashboard({ onLogout }) {
  const [busqueda, setBusqueda] = useState("");
  const [pacientes, setPacientes] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [citas, setCitas] = useState([]);

  async function buscar(evento) {
    evento.preventDefault();
    const resultado = await apiFetch(`/pacientes/buscar?nombre=${busqueda}`);
    setPacientes(resultado);
  }

  async function elegirPaciente(paciente) {
    setSeleccionado(paciente);
    const resultado = await apiFetch(`/pacientes/${paciente.id}/citas`);
    setCitas(resultado);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold text-slate-800">Anisa</h1>
        <button onClick={onLogout} className="text-sm text-slate-500 hover:text-slate-800">
          Cerrar sesión
        </button>
      </header>

      <main className="max-w-5xl mx-auto p-8 space-y-6">
        <form onSubmit={buscar} className="flex gap-2">
          <input
            type="text"
            placeholder="Buscar paciente por nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition"
          >
            Buscar
          </button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow p-4 space-y-2">
            <h2 className="font-medium text-slate-700 mb-2">Resultados</h2>
            {pacientes.length === 0 && (
              <p className="text-slate-400 text-sm">Sin resultados todavía.</p>
            )}
            {pacientes.map((p) => (
              <button
                key={p.id}
                onClick={() => elegirPaciente(p)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 border border-slate-100"
              >
                <p className="font-medium text-slate-800">{p.nombre}</p>
                <p className="text-xs text-slate-500">{p.pais} · {p.idioma}</p>
              </button>
            ))}
          </div>

          <div className="md:col-span-2 bg-white rounded-2xl shadow p-4">
            {!seleccionado && (
              <p className="text-slate-400 text-sm">Elige un paciente de la lista.</p>
            )}
            {seleccionado && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">{seleccionado.nombre}</h2>
                  <p className="text-sm text-slate-500">
                    {seleccionado.aseguradora} · {seleccionado.email}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-slate-700 mb-2">Citas</h3>
                  <div className="space-y-1">
                    {citas.length === 0 && <p className="text-slate-400 text-sm">Sin citas.</p>}
                    {citas.map((c) => (
                      <div key={c.id} className="flex justify-between text-sm border-b border-slate-100 py-1">
                        <span>{c.especialidad} · {c.medico}</span>
                        <span className="text-slate-500">{c.fecha}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {c.estado}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;

