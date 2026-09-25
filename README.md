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

Credenciales de prueba: `admin@anisa.dev` / `admin123` (o `coordinador@anisa.dev` / `coord123`).

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
- **Login con JWT** — cada usuario del equipo inicia sesión y todas las rutas de la API
  requieren su token.

## Cómo funciona

```
React (Vercel)  ──HTTP + JWT──▶  FastAPI (api/main.py)  ──▶  Postgres (Supabase)
                                        │
                                        ▼
                                Asistente (api/agente.py) ──▶ Groq (LLM, tool calling)
                                        │
                                        ▼
                                Resend (correo real) + tabla auditoria
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
| Base de datos | PostgreSQL (Supabase) vía SQLAlchemy |
| Asistente | Groq (LLM) con *tool calling* escrito a mano |
| Correo | Resend (envío real, en modo sandbox a una única bandeja de pruebas) |
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
```

Genera los datos sintéticos (pacientes, citas, pagos, usuarios demo):
```powershell
python -m scripts.generar_datos
```

Arranca la API:
```powershell
uvicorn api.main:app --reload
```

La API estará en `http://localhost:8000/docs`. Al arrancar crea automáticamente cualquier
tabla que falte (por ejemplo `auditoria`) sin tocar las que ya existen.

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

## Limitaciones conocidas

Este es un proyecto de portfolio en construcción activa. Con honestidad sobre lo que falta:

- **Sin aprobación humana antes de las acciones del asistente.** Hoy, si el modelo decide
  enviar un mensaje o modificar una cita, lo ejecuta directamente — no hay un paso de
  "Aprobar / Descartar" antes de que surta efecto. Es la limitación más importante y la
  siguiente en la hoja de ruta.
- **Sin tests ni CI.** No hay suite de pruebas automatizadas ni integración continua todavía.
- Dos cifras del Inicio (pacientes activos, ingresos del mes) son datos de ejemplo — están
  marcadas como tal en la interfaz — porque la API aún no calcula esas métricas.

## Hoja de ruta

- [x] API de pacientes, citas, pagos y mensajes (FastAPI + Postgres)
- [x] Autenticación con JWT
- [x] Panel del equipo en React, desplegado
- [x] Envío real de correo (Resend)
- [x] Asistente con herramientas (Groq, tool calling)
- [x] Límite de pasos y manejo de errores en el bucle del asistente
- [x] Auditoría persistida de las acciones del asistente
- [ ] Aprobación humana ("Aprobar / Descartar") antes de que el asistente ejecute una acción
- [ ] Tests automatizados y CI
- [ ] Métricas reales de pacientes activos e ingresos

## Aviso

Proyecto formativo y de portfolio. **Todos los datos son ficticios y generados
automáticamente.** Anisa no se conecta a ningún sistema hospitalario real ni procesa
información real de pacientes.

## Licencia

MIT © 2026 Firdaous Boulahfa El Mourabit
