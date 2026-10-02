import { createContext, useContext } from "react";

export const UsuarioContext = createContext(null);

export function useUsuario() {
  return useContext(UsuarioContext);
}
