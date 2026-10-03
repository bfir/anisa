import json
import os

from dotenv import load_dotenv
from groq import Groq

from api import db as db_module
from api import rag

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
        "consultar_documentacion": lambda pregunta: rag.buscar_contexto(db, pregunta),
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
    {
        "type": "function",
        "function": {
            "name": "consultar_documentacion",
            "description": (
                "Busca en la documentación de referencia del equipo (políticas de aseguradoras: "
                "cobertura, documentación requerida, preautorización, copagos). Úsala para preguntas "
                "sobre qué cubre o qué exige una aseguradora concreta. Devuelve fragmentos con su "
                "documento y sección de origen, que debes citar en la respuesta."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "pregunta": {
                        "type": "string",
                        "description": "La pregunta o tema a buscar, en lenguaje natural",
                    }
                },
                "required": ["pregunta"],
            },
        },
    },
]

SYSTEM_PROMPT = """Eres Anisa, la asistente del equipo de Atención al Paciente Internacional.
Tienes herramientas para buscar pacientes, consultar citas y pagos pendientes,
enviar mensajes, y consultar documentación de referencia sobre aseguradoras. Usa las
herramientas cuando las necesites. Responde de forma breve y clara en {idioma_respuesta}.
Si envías un mensaje, redáctalo en el idioma del paciente. Si usas consultar_documentacion,
cita siempre el documento y la sección de donde sale la información (p. ej. "según Bupa
Global, sección Documentación requerida..."); si no encuentra nada relevante, dilo
claramente en vez de inventar una respuesta."""

MAX_PASOS = 8  # evita bucles infinitos si el modelo no deja de pedir herramientas


IDIOMAS_RESPUESTA = {"es": "español", "en": "inglés", "ar": "árabe", "fr": "francés"}
ERRORES_PROVEEDOR = {
    "es": "No se ha podido obtener una respuesta del asistente. Revisa el estado de las citas y los mensajes antes de repetir la petición.",
    "en": "The assistant could not return a response. Check appointments and messages before repeating the request.",
    "ar": "تعذر على المساعد تقديم رد. تحقق من المواعيد والرسائل قبل تكرار الطلب.",
    "fr": "L’assistant n’a pas pu fournir de réponse. Vérifiez les rendez-vous et les messages avant de répéter la demande.",
}
ERRORES_LIMITE = {
    "es": "No he podido completar la petición tras varios pasos. Prueba a dividirla en una tarea más pequeña.",
    "en": "I could not complete the request after several steps. Try splitting it into a smaller task.",
    "ar": "تعذر إكمال الطلب بعد عدة خطوات. حاول تقسيمه إلى مهمة أصغر.",
    "fr": "Je n’ai pas pu terminer la demande après plusieurs étapes. Essayez de la diviser en une tâche plus simple.",
}


class ErrorAgente(RuntimeError):
    def __init__(self, mensaje, pasos):
        super().__init__(mensaje)
        self.pasos = pasos


def preguntar(pregunta, db, idioma="es"):
    """Devuelve una tupla: (respuesta_final_en_texto, lista_de_pasos_dados)."""
    herramientas_disponibles = construir_herramientas(db)
    mensajes = [
        {"role": "system", "content": SYSTEM_PROMPT.format(idioma_respuesta=IDIOMAS_RESPUESTA[idioma])},
        {"role": "user", "content": pregunta},
    ]
    pasos = []

    for _ in range(MAX_PASOS):
        try:
            respuesta = cliente.chat.completions.create(
                model=MODELO,
                messages=mensajes,
                tools=DEFINICIONES_HERRAMIENTAS,
            )
        except Exception as excepcion:
            raise ErrorAgente(ERRORES_PROVEEDOR.get(idioma, ERRORES_PROVEEDOR["es"]), pasos) from excepcion
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
            argumentos = None
            resultado = None
            error = None
            try:
                argumentos = json.loads(llamada.function.arguments)
                funcion = herramientas_disponibles[nombre_funcion]
                resultado = funcion(**argumentos)
            except Exception as excepcion:
                db.rollback()  # deja la sesión limpia si la herramienta falló a mitad de un commit
                error = str(excepcion)

            pasos.append(
                {
                    "herramienta": nombre_funcion,
                    "argumentos": argumentos,
                    "resultado": resultado,
                    "error": error,
                }
            )

            mensajes.append(
                {
                    "role": "tool",
                    "tool_call_id": llamada.id,
                    "content": json.dumps(
                        {"resultado": resultado, "error": error}, ensure_ascii=False
                    ),
                }
            )

    raise ErrorAgente(ERRORES_LIMITE.get(idioma, ERRORES_LIMITE["es"]), pasos)
