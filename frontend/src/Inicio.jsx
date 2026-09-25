import { useState, useEffect } from "react";
import { Plus, Calendar, CalendarCheck, Users, Wallet } from "lucide-react";
import { apiFetch } from "./apiClient";
import AlertsStrip from "./AlertsStrip";
import KpiCard from "./KpiCard";
import AppointmentsList from "./AppointmentsList";
import WeeklyOccupancy from "./WeeklyOccupancy";
import PaymentsCard from "./PaymentsCard";

function saludo() {
  const hora = new Date().getHours();
  if (hora < 12) return "Buenos días";
  if (hora < 20) return "Buenas tardes";
  return "Buenas noches";
}

function Inicio() {
  const [usuario, setUsuario] = useState(null);
  const [citasHoy, setCitasHoy] = useState([]);
  const [citasSemana, setCitasSemana] = useState([]);
  const [pagosPendientes, setPagosPendientes] = useState([]);

  useEffect(() => {
    apiFetch("/auth/me").then(setUsuario);
    apiFetch("/citas/proximas?dias=1").then(setCitasHoy);
    apiFetch("/citas/proximas?dias=7").then(setCitasSemana);
    apiFetch("/pagos/pendientes").then(setPagosPendientes);
  }, []);

  const fecha = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const horaActualizacion = new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
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

      <AlertsStrip pagosPendientes={pagosPendientes} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          icono={CalendarCheck}
          etiqueta="Citas hoy"
          valor={citasHoy.length}
          delta="+2 vs ayer"
          datos={[4, 5, 4, 6, 5, 6, citasHoy.length || 1]}
        />
        {/* Sintético fijo: la API no expone pacientes activos ni ingresos */}
        <KpiCard
          icono={Users}
          etiqueta="Pacientes activos"
          valor="248"
          delta="+12 este mes"
          datos={[210, 220, 225, 230, 240, 244, 248]}
        />
        <KpiCard
          icono={Wallet}
          etiqueta="Ingresos · septiembre"
          valor="12.480 €"
          delta="+8,4%"
          datos={[8000, 9000, 9500, 10500, 11200, 12000, 12480]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <AppointmentsList citas={citasHoy} />
          <WeeklyOccupancy citas={citasSemana} />
        </div>
        <div className="space-y-6">
          <PaymentsCard pagos={pagosPendientes} />
        </div>
      </div>

      <p className="text-xs text-ink-soft text-center pt-2">
        Datos sintéticos · Demo de portfolio · Anisa v0.4 · Datos actualizados a las{" "}
        {horaActualizacion}
      </p>
    </div>
  );
}

export default Inicio;
