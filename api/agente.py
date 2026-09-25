import json
import os

from dotenv import load_dotenv
from groq import Groq

from api import db as db_module

load_dotenv()

cliente = Groq(api_key=os.environ["GROQ_API_KEY"])
MODELO= "openai/gpt-oss-120b"

def construir_herramientas(db):
    return {
        "buscar_pacientes": lambda nombre: db_module.buscar_pacientes(db, nombre),
        "citas_proximas": lambda dias=7, **_: db_module.citas_proximas(db, dias),
        "pagos_pendientes": lambda **_: db_module.pagos_pendientes(db),
        "enviar_mensaje": lambda paciente_id, tipo, idioma, texto: db_module.registrar_mensaje(
            db, paciente_id, tipo, idioma, texto
        ),
        "modificar_cita": lambda cita_id, accion, nueva_fecha=None: db_module.actualizar_cita(
            db, cita_id, accion, nueva_fecha
        ),
    }


DEFINICIONES_HERRAMIENTAS = [
    {
        "type": "function",
        "function": {
            "name": "buscar_pacientes",
            "description": "Busca pacientes cuyo nombre contenga el texto dado.",
            "parameters": {
                "type": "object",
                "properties": {
                    "nombre": {"type": "string", "description": "Texto a buscar en el nombre"}
                },
                "required": ["nombre"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "citas_proximas",
            "description": "Devuelve las citas programadas en los próximos N días.",
            "parameters": {
                "type": "object",
                "properties": {
                    "dias": {"type": "integer", "description": "Número de días hacia adelante"}
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "pagos_pendientes",
            "description": "Devuelve todos los pagos que están pendientes de cobro.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "enviar_mensaje",
            "description": (
                "Redacta y envía un mensaje a un paciente en su idioma. "
                "Úsalo para recordatorios de cita o avisos de pago pendiente."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "paciente_id": {"type": "integer"},
                    "tipo": {
                        "type": "string",
                        "enum": ["recordatorio_cita", "pago_pendiente", "informativo"],
                    },
                    "idioma": {"type": "string", "enum": ["es", "en", "ar", "fr"]},
                    "texto": {
                        "type": "string",
                        "description": "El texto del mensaje, redactado en ese idioma",
                    },
                },
                "required": ["paciente_id", "tipo", "idioma", "texto"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "modificar_cita",
            "description": "Reprograma o cancela una cita existente.",
            "parameters": {
                "type": "object",
                "properties": {
                    "cita_id": {"type": "integer"},
                    "accion": {"type": "string", "enum": ["reprogramar", "cancelar"]},
                    "nueva_fecha": {
                        "type": "string",
                        "description": "Nueva fecha y hora (YYYY-MM-DD HH:MM), solo si accion es reprogramar",
                    },
                },
                "required": ["cita_id", "accion"],
            },
        },
    },
]

SYSTEM_PROMPT = """Eres Anisa, la asistente del equipo de Atención al Paciente Internacional.
Tienes herramientas para buscar pacientes, consultar citas y pagos pendientes,
y enviar mensajes. Usa las herramientas cuando las necesites. Responde siempre
en español, de forma breve y clara. Si envías un mensaje, redáctalo en el idioma
del paciente."""


def preguntar(pregunta, db):
    """Devuelve una tupla: (respuesta_final_en_texto, lista_de_pasos_dados)."""
    herramientas_disponibles = construir_herramientas(db)
    mensajes = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": pregunta},
    ]
    pasos = []

    while True:
        respuesta = cliente.chat.completions.create(
            model=MODELO,
            messages=mensajes,
            tools=DEFINICIONES_HERRAMIENTAS,
        )
        mensaje = respuesta.choices[0].message

        if not mensaje.tool_calls:
            return mensaje.content, pasos

        mensajes.append(
            {
                "role": "assistant",
                "content": mensaje.content,
                "tool_calls": [
                    {
                        "id": llamada.id,
                        "type": "function",
                        "function": {
                            "name": llamada.function.name,
                            "arguments": llamada.function.arguments,
                        },
                    }
                    for llamada in mensaje.tool_calls
                ],
            }
        )

        for llamada in mensaje.tool_calls:
            nombre_funcion = llamada.function.name
            argumentos = json.loads(llamada.function.arguments)
            funcion = herramientas_disponibles[nombre_funcion]

            resultado = funcion(**argumentos)

            pasos.append(
                {
                    "herramienta": nombre_funcion,
                    "argumentos": argumentos,
                    "resultado": resultado,
                }
            )

            mensajes.append(
                {
                    "role": "tool",
                    "tool_call_id": llamada.id,
                    "content": json.dumps(resultado, ensure_ascii=False),
                }
            )
