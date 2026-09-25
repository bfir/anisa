import { useState, useEffect } from "react";
import { apiFetch, logout } from "./apiClient";

function Ajustes() {
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    apiFetch("/auth/me").then(setUsuario);
  }, []);

  function cerrarSesion() {
    logout();
    window.location.reload();
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="font-display text-2xl">Ajustes</h1>

      <div className="bg-surface border border-hairline rounded-2xl p-4 space-y-3">
        <h2 className="font-medium">Tu cuenta</h2>
        {usuario && (
          <div className="text-sm space-y-1">
            <p>
              <span className="text-ink-soft">Nombre:</span> {usuario.nombre}
            </p>
            <p>
              <span className="text-ink-soft">Email:</span> {usuario.email}
            </p>
            <p>
              <span className="text-ink-soft">Rol:</span> {usuario.rol}
            </p>
          </div>
        )}
        <button onClick={cerrarSesion} className="text-sm font-medium text-red-ink hover:underline">
          Cerrar sesión
        </button>
      </div>

      <div className="bg-surface border border-hairline rounded-2xl p-4 text-sm text-ink-soft">
        Más ajustes (roles de equipo, notificaciones, idioma de la interfaz) — próximamente.
      </div>
    </div>
  );
}

export default Ajustes;
