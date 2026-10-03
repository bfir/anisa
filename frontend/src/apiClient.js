const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:8000";
let sessionRequest = null;

export function getToken() {
  return localStorage.getItem("token");
}

export function logout() {
  localStorage.removeItem("token");
}

async function configurarSesion() {
  const respuesta = await fetch(`${API_URL}/auth/config`, {
    cache: "no-store",
    signal: AbortSignal.timeout(90_000),
  });
  if (!respuesta.ok) throw new Error("Could not load access settings");
  const configuracion = await respuesta.json();
  if (typeof configuracion.public_demo !== "boolean") throw new Error("Invalid access settings");

  if (configuracion.public_demo && !getToken()) {
    const demo = await fetch(`${API_URL}/auth/demo`, {
      method: "POST",
      signal: AbortSignal.timeout(90_000),
    });
    if (!demo.ok) throw new Error("Could not start demo session");
    const datos = await demo.json();
    if (typeof datos.access_token !== "string" || !datos.access_token) throw new Error("Invalid demo session");
    localStorage.setItem("token", datos.access_token);
  }
  return { publicDemo: configuracion.public_demo, token: getToken() };
}

export function initializeSession() {
  if (!sessionRequest) {
    sessionRequest = configurarSesion().finally(() => { sessionRequest = null; });
  }
  return sessionRequest;
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
    const error = new Error("Login failed");
    error.status = respuesta.status;
    throw error;
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
    const error = new Error(`Error ${respuesta.status} llamando a ${ruta}`);
    error.status = respuesta.status;
    throw error;
  }

  return respuesta.json();
}
