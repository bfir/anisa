const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:8000";
let sessionRequest = null;

export function getToken() {
  return localStorage.getItem("token");
}

export function logout() {
  localStorage.removeItem("token");
}

function isDemoToken(token) {
  if (!token) return false;
  try {
    const payload = token.split(".")[1].replaceAll("-", "+").replaceAll("_", "/");
    return JSON.parse(atob(payload)).demo === true;
  } catch {
    return false;
  }
}

function session(token, publicDemo) {
  return { publicDemo, demo: isDemoToken(token), token };
}

async function crearSesionDemo() {
  async function create() {
    const current = getToken();
    if (current) return current;
    let visitorId = localStorage.getItem("demo_visitor_id");
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem("demo_visitor_id", visitorId);
    }
    const demo = await fetch(`${API_URL}/auth/demo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitor_id: visitorId }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!demo.ok) throw new Error("Could not start demo session");
    const datos = await demo.json();
    if (typeof datos.access_token !== "string" || !datos.access_token) {
      throw new Error("Invalid demo session");
    }
    localStorage.setItem("token", datos.access_token);
    return datos.access_token;
  }

  if (globalThis.navigator?.locks) {
    return globalThis.navigator.locks.request("anisa-demo-session", create);
  }
  return create();
}

async function configurarSesion(teamAccess) {
  const existingToken = getToken();
  try {
    const respuesta = await fetch(`${API_URL}/auth/config`, {
      cache: "no-store",
      signal: AbortSignal.timeout(90_000),
    });
    if (!respuesta.ok) throw new Error("Could not load access settings");
    const configuracion = await respuesta.json();
    if (typeof configuracion.public_demo !== "boolean") {
      throw new Error("Invalid access settings");
    }

    if (teamAccess && isDemoToken(getToken())) logout();
    const token = configuracion.public_demo && !teamAccess
      ? await crearSesionDemo()
      : getToken();
    return session(token, configuracion.public_demo);
  } catch (error) {
    if (existingToken && !teamAccess) return session(existingToken, null);
    throw error;
  }
}

export function initializeSession({ teamAccess = false } = {}) {
  if (!sessionRequest) {
    sessionRequest = configurarSesion(teamAccess).finally(() => { sessionRequest = null; });
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
