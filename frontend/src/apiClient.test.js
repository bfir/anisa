import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { getToken, initializeSession, apiFetch } from "./apiClient.js";

const originalStorage = globalThis.localStorage;

beforeEach(() => {
  const items = new Map();
  mock.method(globalThis, "fetch");
  globalThis.localStorage = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
    removeItem: (key) => items.delete(key),
  };
});
afterEach(() => {
  mock.restoreAll();
  if (originalStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = originalStorage;
});

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function token(claims = {}) {
  return `header.${btoa(JSON.stringify(claims))}.signature`;
}

test("el modo privado no crea un visitante", async () => {
  fetch.mock.mockImplementation(async () => json({ public_demo: false }));
  assert.deepEqual(await initializeSession(), { publicDemo: false, demo: false, token: null });
  assert.equal(fetch.mock.callCount(), 1);
});

test("el arranque concurrente abre una sola sesión sin enviar credenciales", async () => {
  localStorage.setItem("demo_visitor_id", "00000000-0000-4000-8000-000000000001");
  const visitorToken = token({ demo: true });
  fetch.mock.mockImplementation(async (url, options) => {
    if (url.endsWith("/auth/config")) return json({ public_demo: true });
    assert.ok(url.endsWith("/auth/demo"));
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), {
      visitor_id: "00000000-0000-4000-8000-000000000001",
    });
    return json({ access_token: visitorToken, token_type: "bearer" });
  });
  const first = initializeSession();
  const second = initializeSession();
  assert.equal(first, second);
  assert.deepEqual(await first, { publicDemo: true, demo: true, token: visitorToken });
  assert.equal(fetch.mock.callCount(), 2);
  assert.equal(getToken(), visitorToken);

  fetch.mock.mockImplementation(async (_url, options) => {
    assert.equal(options.headers.Authorization, `Bearer ${visitorToken}`);
    return json([]);
  });
  assert.deepEqual(await apiFetch("/pacientes/buscar?nombre=demo"), []);
});

test("una visita posterior conserva su identidad y sus propuestas", async () => {
  const existingToken = token({ demo: true });
  localStorage.setItem("token", existingToken);
  fetch.mock.mockImplementation(async () => json({ public_demo: true }));
  assert.deepEqual(await initializeSession(), { publicDemo: true, demo: true, token: existingToken });
  assert.equal(fetch.mock.callCount(), 1);
});

test("un fallo al abrir la demo permite reintentar sin guardar un token inválido", async () => {
  fetch.mock.mockImplementation(async (url) => url.endsWith("/auth/config")
    ? json({ public_demo: true }) : json({ detail: "Unavailable" }, 503));
  await assert.rejects(initializeSession());
  assert.equal(getToken(), null);
  fetch.mock.mockImplementation(async (url) => url.endsWith("/auth/config")
    ? json({ public_demo: true }) : json({ access_token: token({ demo: true }), token_type: "bearer" }));
  assert.equal((await initializeSession()).demo, true);
});

test("un fallo de conexión no se interpreta como acceso privado", async () => {
  fetch.mock.mockImplementation(async () => { throw new TypeError("Network error"); });
  await assert.rejects(initializeSession());
  assert.equal(getToken(), null);
});

test("un fallo de configuración conserva una sesión existente", async () => {
  const existingToken = token({ demo: true });
  localStorage.setItem("token", existingToken);
  fetch.mock.mockImplementation(async () => json({ detail: "Unavailable" }, 503));
  assert.deepEqual(await initializeSession(), {
    publicDemo: null,
    demo: true,
    token: existingToken,
  });
});

test("el acceso del equipo descarta la sesión demo y muestra el login", async () => {
  localStorage.setItem("token", token({ demo: true }));
  fetch.mock.mockImplementation(async () => json({ public_demo: true }));
  assert.deepEqual(await initializeSession({ teamAccess: true }), {
    publicDemo: true,
    demo: false,
    token: null,
  });
  assert.equal(getToken(), null);
  assert.equal(fetch.mock.callCount(), 1);
});
