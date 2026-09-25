import { useState, useEffect } from "react";
import { Plus, Calendar } from "lucide-react";
import { apiFetch } from "./apiClient";

function saludo() {
  const hora = new Date().getHours();
  if (hora < 12) return "Buenos días";
  if (hora < 20) return "Buenas tardes";
  return "Buenas noches";
}

function Inicio() {
  const [usuario, setUsuario] = useState(null);
  const [citasHoy, setCitasHoy] = useState([]);

  useEffect(() => {
    apiFetch("/auth/me").then(setUsuario);
    apiFetch("/citas/proximas?dias=1").then(setCitasHoy);
  }, []);

  const fecha = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="font-display text-3xl">
            {saludo()}, {usuario ? usuario.nombre : "..."}
          </h1>
          <p className="text-ink-soft mt-1 capitalize">
            {fecha} · {citasHoy.length} citas hoy
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1 px-4 py-2 rounded-lg border border-hairline bg-surface text-sm font-medium hover:bg-bg transition">
            <Plus size={16} /> Nuevo paciente
          </button>
          <button className="flex items-center gap-1 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition">
            <Calendar size={16} /> Nueva cita
          </button>
        </div>
      </div>
    </div>
  );
}

export default Inicio;
