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

test("el modo privado no crea un visitante", async () => {
  fetch.mock.mockImplementation(async () => json({ public_demo: false }));
  assert.deepEqual(await initializeSession(), { publicDemo: false, token: null });
  assert.equal(fetch.mock.callCount(), 1);
});

test("el arranque concurrente abre una sola sesión sin enviar credenciales", async () => {
  fetch.mock.mockImplementation(async (url, options) => {
    if (url.endsWith("/auth/config")) return json({ public_demo: true });
    assert.ok(url.endsWith("/auth/demo"));
    assert.equal(options.method, "POST");
    assert.equal(options.body, undefined);
    return json({ access_token: "visitor-token", token_type: "bearer" });
  });
  const first = initializeSession();
  const second = initializeSession();
  assert.equal(first, second);
  assert.deepEqual(await first, { publicDemo: true, token: "visitor-token" });
  assert.equal(fetch.mock.callCount(), 2);
  assert.equal(getToken(), "visitor-token");

  fetch.mock.mockImplementation(async (_url, options) => {
    assert.equal(options.headers.Authorization, "Bearer visitor-token");
    return json([]);
  });
  assert.deepEqual(await apiFetch("/pacientes/buscar?nombre=demo"), []);
});

test("una visita posterior conserva su identidad y sus propuestas", async () => {
  localStorage.setItem("token", "existing-token");
  fetch.mock.mockImplementation(async () => json({ public_demo: true }));
  assert.deepEqual(await initializeSession(), { publicDemo: true, token: "existing-token" });
  assert.equal(fetch.mock.callCount(), 1);
});

test("un fallo al abrir la demo permite reintentar sin guardar un token inválido", async () => {
  fetch.mock.mockImplementation(async (url) => url.endsWith("/auth/config")
    ? json({ public_demo: true }) : json({ detail: "Unavailable" }, 503));
  await assert.rejects(initializeSession());
  assert.equal(getToken(), null);
  fetch.mock.mockImplementation(async (url) => url.endsWith("/auth/config")
    ? json({ public_demo: true }) : json({ access_token: "retry-token", token_type: "bearer" }));
  assert.equal((await initializeSession()).token, "retry-token");
});

test("un fallo de conexión no se interpreta como acceso privado", async () => {
  fetch.mock.mockImplementation(async () => { throw new TypeError("Network error"); });
  await assert.rejects(initializeSession());
  assert.equal(getToken(), null);
});
