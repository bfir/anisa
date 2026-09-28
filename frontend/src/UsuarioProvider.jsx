import { useEffect, useState } from "react";
import { apiFetch } from "./apiClient";
import { UsuarioContext } from "./usuarioContext";

export function UsuarioProvider({ children }) {
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    apiFetch("/auth/me")
      .then(setUsuario)
      .catch(() => setUsuario(null));
  }, []);

  return <UsuarioContext.Provider value={usuario}>{children}</UsuarioContext.Provider>;
}
