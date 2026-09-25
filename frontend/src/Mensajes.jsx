import { useState } from "react";
import { Search, Send } from "lucide-react";
import { apiFetch } from "./apiClient";

const IDIOMAS = ["es", "en", "ar", "fr"];
const NOMBRE_IDIOMA = { es: "Español", en: "English", ar: "العربية", fr: "Français" };

function Mensajes() {
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [paciente, setPaciente] = useState(null);
  const [historial, setHistorial] = useState([]);

  const [tipo, setTipo] = useState("informativo");
  const [idioma, setIdioma] = useState("es");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);

  async function buscar(evento) {
    evento.preventDefault();
    const datos = await apiFetch(`/pacientes/buscar?nombre=${encodeURIComponent(busqueda)}`);
    setResultados(datos);
  }

  async function elegirPaciente(p) {
    setPaciente(p);
    setResultados([]);
    setBusqueda("");
    setIdioma(p.idioma); // por defecto, el idioma real del paciente
    setAviso(null);
    const mensajes = await apiFetch(`/pacientes/${p.id}/mensajes`);
    setHistorial(mensajes);
  }

  async function enviar(evento) {
    evento.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    setAviso(null);
    try {
      const mensaje = await apiFetch("/mensajes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paciente_id: paciente.id, tipo, idioma, texto }),
      });
      setHistorial((h) => [mensaje, ...h]);
      setTexto("");
      setAviso(
        mensaje.estado_envio === "enviado"
          ? "Mensaje enviado correctamente."
          : "Se guardó, pero el envío del correo falló."
      );
    } catch {
      setAviso("No se pudo enviar el mensaje.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="font-display text-2xl">Mensajes</h1>

      <form onSubmit={buscar} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar paciente por nombre..."
            className="w-full border border-hairline rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <button className="bg-accent text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition">
          Buscar
        </button>
      </form>

      {resultados.length > 0 && (
        <div className="bg-surface border border-hairline rounded-2xl divide-y divide-hairline">
          {resultados.map((p) => (
            <button
              key={p.id}
              onClick={() => elegirPaciente(p)}
              className="w-full text-left px-4 py-2 hover:bg-bg"
            >
              <p className="font-medium">{p.nombre}</p>
              <p className="text-xs text-ink-soft">
                {p.pais} · {NOMBRE_IDIOMA[p.idioma] || p.idioma}
              </p>
            </button>
          ))}
        </div>
      )}

      {paciente && (
        <div className="bg-surface border border-hairline rounded-2xl p-4 space-y-4">
          <div>
            <h2 className="font-display text-lg">{paciente.nombre}</h2>
            <p className="text-xs text-ink-soft">
              Idioma habitual: {NOMBRE_IDIOMA[paciente.idioma] || paciente.idioma}
            </p>
          </div>

          <form onSubmit={enviar} className="space-y-3">
            <div className="flex gap-3">
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="border border-hairline rounded-lg px-3 py-2 text-sm"
              >
                <option value="recordatorio_cita">Recordatorio de cita</option>
                <option value="pago_pendiente">Pago pendiente</option>
                <option value="informativo">Informativo</option>
              </select>
              <select
                value={idioma}
                onChange={(e) => setIdioma(e.target.value)}
                className="border border-hairline rounded-lg px-3 py-2 text-sm"
              >
                {IDIOMAS.map((codigo) => (
                  <option key={codigo} value={codigo}>
                    {NOMBRE_IDIOMA[codigo]}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribe el mensaje..."
              rows={3}
              dir={idioma === "ar" ? "rtl" : "ltr"}
              className="w-full border border-hairline rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              type="submit"
              disabled={enviando}
              className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              <Send size={16} /> {enviando ? "Enviando..." : "Enviar mensaje"}
            </button>
            {aviso && <p className="text-sm text-ink-soft">{aviso}</p>}
          </form>

          <div>
            <p className="text-xs font-semibold tracking-widest text-ink-soft mb-2">
              HISTORIAL
            </p>
            {historial.length === 0 && (
              <p className="text-sm text-ink-soft">Sin mensajes todavía.</p>
            )}
            <div className="space-y-2">
              {historial.map((m) => (
                <div key={m.id} className="border-t border-hairline pt-2">
                  <p className="text-sm">{m.texto}</p>
                  <p className="text-xs text-ink-soft">
                    {m.enviado_en} · {NOMBRE_IDIOMA[m.idioma] || m.idioma} ·{" "}
                    {m.estado_envio === "enviado" ? "Enviado" : "Fallido"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Mensajes;
