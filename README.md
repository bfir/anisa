# Anisa

> Asistente multilingüe (ES · EN · AR · FR) para equipos de atención al paciente internacional.

Anisa ayuda al personal de atención al paciente internacional a resolver, en lenguaje natural,
tareas que hoy son manuales y repetitivas: localizar a un paciente, consultar sus citas,
detectar pagos pendientes y preparar y enviar recordatorios en el idioma de cada paciente.

**Estado:** en desarrollo · **Demo con datos 100 % sintéticos** — ningún dato real de pacientes.

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
- **Recordatorios internos** para el equipo.
- **Registro auditable** — cada acción del asistente queda trazada: qué consultó,
  qué decidió y qué envió.

## Cómo funciona

Anisa es un **agente**: un modelo de lenguaje que interpreta la petición del usuario y decide
qué herramientas ejecutar (buscar en la base de datos, consultar citas, redactar un mensaje…),
encadena los pasos necesarios y devuelve el resultado junto con el registro de lo que hizo.

_Diagrama de arquitectura: pendiente._

## Stack

| Capa | Tecnología |
|---|---|
| Lenguaje | Python |
| API | FastAPI |
| Interfaz del equipo | Streamlit |
| Agente | LLM con herramientas (function calling) |
| Datos | SQLite con datos sintéticos |

## Ejecutar en local

_Pendiente — se documentará cuando exista la primera versión ejecutable._

## Hoja de ruta

- [x] Estructura del proyecto
- [ ] Generador de datos sintéticos (pacientes, citas, pagos)
- [ ] API de pacientes, citas y pagos (FastAPI)
- [ ] Panel del equipo (Streamlit)
- [ ] Agente con herramientas
- [ ] Redacción y envío multilingüe de mensajes
- [ ] Registro auditable de acciones
- [ ] Despliegue

## Aviso

Proyecto formativo y de portfolio. **Todos los datos son ficticios y generados
automáticamente.** Anisa no se conecta a ningún sistema hospitalario real ni procesa
información real de pacientes.

## Licencia

MIT © 2026 Firdaous Boulahfa El Mourabit
