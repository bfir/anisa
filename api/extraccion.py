import json
from api.modelos import SolicitudCita

PROMPT_EXTRACCION = """Extrae de este mensaje de un paciente los datos para pedir una cita médica.
Devuelve SOLO un JSON con estas claves (usa null si el dato no aparece):
nombre, fecha_nacimiento (formato YYYY-MM-DD), aseguradora,
especialidad (una de: Cardiología, Traumatología, Dermatología, Oftalmología, Ginecología, Neurología),
fecha_preferida (YYYY-MM-DD), franja_preferida (mañana/tarde/cualquiera),
idioma, motivo_administrativo, urgencia_detectada (true/false).

Mensaje del paciente: "{texto}" """

def extraer_solicitud_cita(cliente, modelo, texto):
    respuesta = cliente.chat.completions.create(
        model=modelo,
        messages=[{"role": "user", "content": PROMPT_EXTRACCION.format(texto=texto)}],
        response_format={"type": "json_object"},
    )
    contenido = respuesta.choices[0].message.content
    try:
        datos=json.loads(contenido)
        return SolicitudCita(**datos), []
    except Exception as error:
        return SolicitudCita(), [str(error)]