const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function getToken() {
  return localStorage.getItem("token");
}

export function logout() {
  localStorage.removeItem("token");
}

export async function login(email, password) {
  const cuerpo = new URLSearchParams();
  cuerpo.append("username", email);
  cuerpo.append("password", password);

  const respuesta = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: cuerpo,
  });

  if (!respuesta.ok) {
    throw new Error("Email o contraseña incorrectos");
  }
  const datos = await respuesta.json();
  localStorage.setItem("token", datos.access_token);
}

export async function apiFetch(ruta, opciones = {}) {
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    ...opciones,
    headers: {
      ...opciones.headers,
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (respuesta.status === 401) {
    logout();
    window.location.reload();
    return null;
  }

  if (!respuesta.ok) {
    throw new Error(`Error ${respuesta.status} llamando a ${ruta}`);
  }

  return respuesta.json();
}
