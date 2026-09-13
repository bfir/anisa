# Anisa

> Asistente multilingüe (ES · EN · AR · FR) para equipos de atención al paciente internacional.

Anisa ayuda al personal de atención al paciente internacional a resolver, en lenguaje natural,
tareas que hoy son manuales y repetitivas: localizar a un paciente, consultar sus citas,
detectar pagos pendientes y preparar y enviar recordatorios en el idioma de cada paciente.

**Estado:** demo funcional, desplegada · **Datos 100 % sintéticos** — ningún dato real de pacientes.

## 🔗 Demo en vivo

- **Panel:** https://exyunvzjegqw82dadhziht.streamlit.app
- **API:** https://anisa.onrender.com/docs

> La API está en el plan gratuito de Render y "duerme" tras un rato de inactividad — la
> primera petición puede tardar ~50 segundos en responder mientras arranca.

---

## El problema

En un servicio de pacientes internacionales, el personal gestiona a diario:

- **Barreras de idioma** — pacientes que hablan español, árabe, inglés o francés.
- **Seguimiento de citas** — recordar quién tiene cita pronto y avisar con antelación.
- **Documentación y pagos** — qué pacientes tienen importes pendientes con la aseguradora.

Todo repartido entre varias herramientas y hojas de cálculo, y con tiempos de respuesta ajustados.

## Qué hace Anisa

- **Búsqueda de pacientes** por nombre, identificador o pasaporte.
- **Agenda** — todas las citas de un paciente y las citas próximas del servicio.
- **Pagos pendientes** — qué pacientes tienen importes sin abonar.
- **Mensajes automáticos** — redacta y envía recordatorios (cita próxima, pago pendiente)
  en el idioma del paciente.
- **Un agente conversacional** que hace todo lo anterior a partir de una pregunta en
  lenguaje natural, mostrando qué herramientas usó y por qué.
- **Registro auditable** — cada acción del asistente queda trazada: qué consultó,
  qué decidió y qué envió.

## Cómo funciona

Anisa es un **agente**: un modelo de lenguaje (vía Groq) interpreta la petición del usuario
y decide qué herramientas ejecutar (buscar en la base de datos, consultar citas, redactar
un mensaje…), encadena los pasos necesarios y devuelve el resultado junto con el registro
de lo que hizo. Hay dos implementaciones en el repo para comparar enfoques:

- `scripts/agente.py` — bucle de *tool calling* escrito a mano.
- `scripts/agente_smolagents.py` — el mismo agente con el framework [smolagents](https://github.com/huggingface/smolagents).

```
Streamlit (panel)  ──HTTP──▶  FastAPI (api/main.py)  ──▶  SQLite (data/anisa.db)
                                      │
                                      ▼
                              Agente (api/agente.py) ──▶ Groq (LLM)
```

## Stack

| Capa | Tecnología |
|---|---|
| Lenguaje | Python |
| API | FastAPI + Pydantic |
| Interfaz del equipo | Streamlit |
| Agente | Groq (LLM) con *tool calling*, y una variante con smolagents |
| Datos | SQLite con datos sintéticos (generados con Faker) |
| Despliegue | Render (API) + Streamlit Community Cloud (panel) |

## Ejecutar en local

```powershell
git clone https://github.com/bfir/anisa.git
cd anisa
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Crea un archivo `.env` en la raíz con tu clave de Groq:
```
GROQ_API_KEY=tu_clave
```

Genera los datos sintéticos:
```powershell
python scripts\generar_datos.py
```

Arranca la API (una terminal) y el panel (otra terminal):
```powershell
uvicorn api.main:app --reload
streamlit run streamlit_app.py
```

El panel estará en `http://localhost:8501` y la API en `http://localhost:8000/docs`.

## Hoja de ruta

- [x] Estructura del proyecto
- [x] Generador de datos sintéticos (pacientes, citas, pagos)
- [x] API de pacientes, citas y pagos (FastAPI)
- [x] Panel del equipo (Streamlit)
- [x] Agente con herramientas (a mano y con smolagents)
- [x] Redacción y envío multilingüe de mensajes
- [x] Registro auditable de acciones
- [x] Despliegue (Render + Streamlit Community Cloud)

## Aviso

Proyecto formativo y de portfolio. **Todos los datos son ficticios y generados
automáticamente.** Anisa no se conecta a ningún sistema hospitalario real ni procesa
información real de pacientes.

## Licencia

MIT © 2026 Firdaous Boulahfa El Mourabit
