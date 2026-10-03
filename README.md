# Anisa

> Copiloto interno multilingüe (ES · EN · AR · FR) para el equipo de Atención al Paciente
> Internacional de un hospital.

Anisa **no es una app para pacientes**: es una herramienta de trabajo para el personal
administrativo que gestiona pacientes internacionales. Les ayuda a resolver, en lenguaje
natural, tareas hoy manuales y repetitivas: localizar a un paciente, consultar sus citas,
detectar pagos pendientes y preparar y enviar recordatorios en el idioma de cada paciente.

**Estado:** demo funcional, desplegada · **Datos 100 % sintéticos** — ningún dato real de pacientes.

## 🔗 Demo en vivo

- **Panel:** https://anisa-rho.vercel.app
- **API:** https://anisa.onrender.com/docs

> La API está en el plan gratuito de Render y "duerme" tras un rato de inactividad — la
> primera petición puede tardar ~50 segundos en responder mientras arranca.

Con `PUBLIC_DEMO_ENABLED=true` en la API, el panel abre directamente sin introducir
correo ni contraseña. Cada navegador recibe automáticamente una identidad de visitante
con rol `coordinador`; no se publican contraseñas en el frontend.

En modo privado (el predeterminado), se conserva el formulario. Credenciales de prueba
para una base con datos sintéticos: `admin@anisa.dev` / `admin123`
(o `coordinador@anisa.dev` / `coord123`).

Ambos roles pueden usar el asistente, enviar mensajes y modificar citas. Los visitantes
también pueden probar estos flujos; las acciones propuestas por el asistente siguen
requiriendo aprobación y pertenecen al visitante que las creó. La auditoría es exclusiva
de `admin`.

### Activar el acceso público en el despliegue

1. Desplegar en Render la versión de la API que incluye `/auth/config` y `/auth/demo`.
2. En Render → servicio de Anisa → Environment, añadir `PUBLIC_DEMO_ENABLED=true`
   y guardar con despliegue.
3. Desplegar en Vercel esta versión del frontend. `VITE_API_URL` debe apuntar a esa API;
   no hace falta ninguna variable adicional en Vercel.

El frontend consulta `GET /auth/config` al arrancar y, si no hay token guardado, abre
una sesión con `POST /auth/demo`. El JWT se conserva en `localStorage` durante las
visitas posteriores y caduca a las 24 horas, igual que las sesiones normales. Un fallo
de conexión muestra un reintento; la API gratuita puede tardar en despertar.

Este modo está pensado para la **demo con datos sintéticos**. Los pacientes, citas,
pagos y mensajes se comparten entre visitantes, incluidos los cambios. Las propuestas
tienen propietarios independientes. Las identidades de visitante se guardan en
`usuarios` para conservar las referencias de auditoría; no se eliminan automáticamente.
Los correos siguen dirigidos exclusivamente a `EMAIL_DEMO_DESTINO`, el buzón de pruebas.

Para volver al acceso privado, establecer `PUBLIC_DEMO_ENABLED=false` y redesplegar
la API. Los tokens demo dejan de ser válidos, incluso antes de su caducidad, y el
frontend vuelve al formulario al recargar. Los tokens del equipo conservan su validez.

---

## El problema

En un servicio de pacientes internacionales, el personal gestiona a diario:

- **Barreras de idioma** — pacientes que hablan español, árabe, inglés o francés.
- **Seguimiento de citas** — recordar quién tiene cita pronto, y reprogramar o cancelar sobre la marcha.
- **Documentación y pagos** — qué pacientes tienen importes pendientes con la aseguradora.

Todo repartido entre varias herramientas y hojas de cálculo, y con tiempos de respuesta ajustados.

## Qué hace Anisa

- **Panel del equipo** (React) — inicio con la agenda del día, pacientes, citas, pagos,
  mensajes e informes en vivo.
- **Búsqueda de pacientes** por nombre, y ficha con sus citas y mensajes.
- **Gestión de citas** — reprogramar o cancelar, desde la interfaz o por API.
- **Pagos pendientes** — qué pacientes tienen importes sin abonar.
- **Mensajes reales** — redacta y envía por correo (vía Resend) recordatorios o avisos en el
  idioma del paciente, con historial de envío.
- **Un asistente conversacional** (Groq + *tool calling*) que hace todo lo anterior a partir de
  una pregunta en lenguaje natural, mostrando qué herramientas usó.
- **Auditoría persistida** — cada pregunta al asistente, quién la hizo, qué herramientas
  ejecutó y qué respondió queda guardado en base de datos, no solo en la respuesta HTTP.
- **Acceso con JWT** — sesión automática de visitante en la demo pública o login del
  equipo en modo privado. Las rutas de datos conservan sus controles de token y rol.
- **Consulta de documentación de aseguradoras (RAG)** — el asistente puede buscar en políticas
  de cobertura, documentación requerida y preautorización de 7 aseguradoras, citando siempre
  el documento y la sección de origen. Ver [RAG sobre documentación](#rag-sobre-documentación-de-aseguradoras).
- **Servidor MCP** — los mismos datos de documentación y auditoría, expuestos de forma
  estandarizada a cualquier cliente compatible con el [Model Context Protocol](https://modelcontextprotocol.io)
  (Claude Desktop, MCP Inspector...). Ver [Servidor MCP](#servidor-mcp).

## Cómo funciona

```
React (Vercel)  ──HTTP + JWT──▶  FastAPI (api/main.py)  ──▶  Postgres (Supabase)
                                        │                           ▲
                                        ▼                           │ pgvector
                                Asistente (api/agente.py) ──▶ Groq (LLM, tool calling)
                                        │                           │
                                        ▼                           │
                                Resend (correo real) + tabla auditoria
                                        │
                                        ▼
                                consultar_documentacion ──▶ Cohere (embeddings) ──▶ documento_chunks

Cliente MCP (Claude Desktop, Inspector...) ──stdio──▶ mcp_server.py ──▶ misma Postgres (solo lectura)
```

El asistente es un **agente**: un modelo de lenguaje (vía Groq) interpreta la petición del
usuario y decide qué herramientas ejecutar (buscar en la base de datos, consultar citas,
redactar y enviar un mensaje, modificar una cita...), encadena los pasos necesarios y
devuelve el resultado. El bucle tiene un límite de pasos y captura errores de cada
herramienta para no romper la petición si algo falla a mitad de camino.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite + React Router + Tailwind CSS v4 |
| API | FastAPI + Pydantic |
| Autenticación | JWT (PyJWT) + contraseñas con argon2 (passlib) |
| Base de datos | PostgreSQL (Supabase) vía SQLAlchemy, migraciones con Alembic |
| Asistente | Groq (LLM) con *tool calling* escrito a mano |
| Correo | Resend (envío real, en modo sandbox a una única bandeja de pruebas) |
| RAG | Cohere (`embed-multilingual-v3.0`, API alojada) + pgvector (extensión de Postgres) |
| Integración | Servidor MCP (SDK oficial de Python) |
| Tests | pytest |
| Despliegue | Render (API) + Vercel (frontend) + Supabase (base de datos) |

## Ejecutar en local

### API

```powershell
git clone https://github.com/bfir/anisa.git
cd anisa
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Crea un archivo `.env` en la raíz con:
```
DATABASE_URL=postgresql://...tu-conexión-a-supabase...
GROQ_API_KEY=tu_clave
SECRET_KEY=una_cadena_aleatoria_larga
RESEND_API_KEY=tu_clave
EMAIL_DEMO_DESTINO=tu_email_de_pruebas
PUBLIC_DEMO_ENABLED=false
```

Usa `PUBLIC_DEMO_ENABLED=true` si quieres probar en local la entrada sin contraseña.

Aplica las migraciones (crea/actualiza las tablas en tu base):
```powershell
alembic upgrade head
```

Genera los datos sintéticos (pacientes, citas, pagos, usuarios demo). Los scripts de
`scripts/` (y los tests) necesitan además las dependencias de desarrollo:
```powershell
pip install -r requirements-dev.txt
python -m scripts.generar_datos
```

Arranca la API:
```powershell
uvicorn api.main:app --reload
```

La API estará en `http://localhost:8000/docs`.

### Migraciones (Alembic)

El esquema ya no se crea solo (`Base.metadata.create_all` se retiró): cualquier cambio a
`api/models_orm.py` necesita su migración explícita.

```powershell
# después de cambiar un modelo en api/models_orm.py
alembic revision --autogenerate -m "descripción del cambio"
# revisa el archivo generado en alembic/versions/ antes de aplicarlo
alembic upgrade head
```

`alembic/env.py` toma `DATABASE_URL` de `.env` — no hay ninguna contraseña en `alembic.ini` ni en
el repo.

### Frontend

```powershell
cd frontend
npm install
```

Crea `frontend/.env` con:
```
VITE_API_URL=http://localhost:8000
```

```powershell
npm run dev
```

El panel estará en `http://localhost:5173`.

### Verificar el acceso y las aprobaciones

```powershell
python -m pytest tests/test_acceso_demo.py tests/test_aprobaciones.py tests/test_agente_idioma.py
cd frontend
npm test
npm run lint
npm run build
```

Estas pruebas comprueban el acceso privado y público, permisos, revocación de tokens
demo, separación de propuestas entre visitantes y reintentos del cliente. Usan una
base SQLite en memoria y no necesitan llamadas reales a Groq, Cohere ni Resend.
La evaluación RAG sigue siendo una prueba de integración aparte con proveedores.

## RAG sobre documentación de aseguradoras

El asistente tiene una herramienta de solo lectura, `consultar_documentacion`, que busca
semánticamente (no por palabras clave) en 7 documentos sintéticos de políticas de aseguradoras
(`data/documentos/`). Cada pregunta se compara contra fragmentos ya convertidos en vectores
(embeddings) guardados en Postgres con pgvector, y el asistente cita siempre el documento y la
sección de donde sale la información.

Se probó primero con un modelo local (`sentence-transformers`, multilingüe) y se midió su coste
real antes de decidir: **627 MB de RAM** solo por tenerlo cargado, por encima del límite de
512 MB del plan gratuito de Render. Se sustituyó por la API alojada de Cohere
(`embed-multilingual-v3.0`), que no consume memoria en el propio servicio.

**Evaluación (`pytest tests/`), sobre 20 preguntas con respuesta de referencia marcada a mano,
2 de ellas deliberadamente sin respuesta para comprobar que el asistente no se la inventa:**

| Métrica | Resultado |
|---|---|
| Recall@5 de la recuperación | 100 % (18/18 preguntas con respuesta real) |
| Fidelidad (todo lo dicho está en el contexto recuperado, juzgado por un LLM) | 17-19/20 según la tanda* |
| Corrección (coincide con la respuesta de referencia, juzgado por un LLM) | 19-20/20 según la tanda* |
| Recuperación vectorial vs. híbrida (vector + BM25, comparadas con datos) | Empate 100 % en recall@1/3/5 — se mantiene la vectorial por ser más simple |

\* El asistente no usa `temperature=0`, así que el resultado exacto varía ligeramente entre
ejecuciones; siempre se ha mantenido por encima del umbral de aceptación (80 % y 70 % respectivamente).

**Latencia medida** (llamando al servidor MCP como lo haría un cliente real, sesión ya iniciada):
- `buscar_docs`: ~3.6 s por consulta — dominado por la llamada de red a la API de Cohere.
- `consultar_auditoria`: ~0.1-0.4 s por consulta — es solo una consulta SQL, sin llamada externa.

**Coste medido** (no estimado a ojo — verificado contra la página de precios de Cohere a fecha de
este commit): `embed-multilingual-v3.0` cuesta **0,10 $ por millón de tokens de entrada**. Una
pregunta típica (~25 tokens) cuesta por tanto unos **0,0000025 $** — en la práctica, gratis a esta
escala; a un millón de preguntas, costaría unos 2,50 $. `consultar_auditoria` no tiene coste de
API, solo el coste fijo ya existente de Supabase.

## Servidor MCP

Además del asistente conversacional, los mismos datos de solo lectura se exponen por
[MCP](https://modelcontextprotocol.io) (`mcp_server.py`), el protocolo abierto para conectar
herramientas a clientes de IA de forma estandarizada — así Claude Desktop, el MCP Inspector, o
cualquier otro cliente compatible, pueden usarlos sin pasar por el asistente de Anisa. Expone dos
herramientas, ambas de solo lectura (nunca envían mensajes ni modifican citas):

- `buscar_docs(pregunta)` — igual que la herramienta del asistente, busca en la documentación de
  aseguradoras.
- `consultar_auditoria(filtro)` — busca en el historial de preguntas ya hechas al asistente, por
  texto contenido en la pregunta o la respuesta.

**Probarlo con el Inspector visual** (requiere Node.js, ya instalado en este equipo):
```powershell
mcp dev mcp_server.py
```
Abre una interfaz web donde se pueden listar y ejecutar las herramientas a mano.

**Probarlo como lo haría un cliente real**, sin interfaz gráfica (así se verificó en el desarrollo):
un cliente MCP en Python (`mcp.client.stdio.stdio_client` + `mcp.ClientSession`) que arranca
`mcp_server.py` como subproceso, llama a `list_tools()` y a `call_tool(...)`, y lee la respuesta.

**Conectarlo a Claude Desktop:** añadir en su `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "anisa": {
      "command": "python",
      "args": ["C:/Users/bfir2/proyectos/anisa/mcp_server.py"]
    }
  }
}
```

**Limitación honesta:** este servidor MCP, igual que la API de FastAPI en su endpoint raíz, no
tiene autenticación — cualquiera que lo ejecute en su máquina puede llamarlo. Es aceptable porque
todo son datos sintéticos, pero en un sistema real habría que añadir verificación de token, como
ya tiene el resto de la API.

## Limitaciones conocidas

Este es un proyecto de portfolio en construcción activa. Con honestidad sobre lo que falta:

- **Sin aprobación humana antes de las acciones del asistente.** Hoy, si el modelo decide
  enviar un mensaje o modificar una cita, lo ejecuta directamente — no hay un paso de
  "Aprobar / Descartar" antes de que surta efecto. Es la limitación más importante y la
  siguiente en la hoja de ruta.
- **Sin CI** (sí hay tests con pytest, pero no se ejecutan automáticamente en cada cambio todavía).
- Dos cifras del Inicio (pacientes activos, ingresos del mes) son datos de ejemplo — están
  marcadas como tal en la interfaz — porque la API aún no calcula esas métricas.
- El servidor MCP no tiene autenticación (ver más arriba).

## Hoja de ruta

- [x] API de pacientes, citas, pagos y mensajes (FastAPI + Postgres)
- [x] Autenticación con JWT
- [x] Panel del equipo en React, desplegado
- [x] Envío real de correo (Resend)
- [x] Asistente con herramientas (Groq, tool calling)
- [x] Límite de pasos y manejo de errores en el bucle del asistente
- [x] Auditoría persistida de las acciones del asistente
- [x] RAG sobre documentación de aseguradoras (Cohere + pgvector), con evaluación cuantitativa
- [x] Servidor MCP de solo lectura (documentación + auditoría)
- [x] Tests automatizados (pytest)
- [x] Aprobación humana ("Aprobar / Descartar") antes de que el asistente ejecute una acción
- [ ] Integración continua (CI)
- [ ] Métricas reales de pacientes activos e ingresos

## Aprobación de acciones del asistente

El asistente prepara propuestas para enviar mensajes o modificar citas. No ejecuta estas
acciones durante una pregunta: el operador revisa el paciente, texto o cita y pulsa
«Aprobar y ejecutar» o «Descartar». Las propuestas se conservan en auditoría, pertenecen
al usuario que las solicita y caducan a los 15 minutos.

La aprobación reserva la propuesta antes de ejecutar para impedir reenvíos por doble clic
o repetición de la petición. Una propuesta en curso cuyo resultado no se haya confirmado
debe revisarse antes de solicitar otra. Los cambios de cita comprueban que la cita sigue
igual que cuando se propuso. El correo mantiene el destino de pruebas de la demo.

API: `GET /agente/acciones`, `GET /agente/acciones/{id}` y
`POST /agente/acciones/{id}` con `{"decision": "aprobar"}` o
`{"decision": "rechazar"}`. Todas requieren un operador autenticado.

## Aviso

Proyecto formativo y de portfolio. **Todos los datos son ficticios y generados
automáticamente.** Anisa no se conecta a ningún sistema hospitalario real ni procesa
información real de pacientes.

## Licencia

MIT © 2026 Firdaous Boulahfa El Mourabit
