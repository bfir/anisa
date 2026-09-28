import os
from html import escape

import resend

resend.api_key = os.environ["RESEND_API_KEY"]
EMAIL_DEMO_DESTINO = os.environ["EMAIL_DEMO_DESTINO"]

ASUNTOS = {
    "recordatorio_cita": "Recordatorio de cita",
    "pago_pendiente": "Pago pendiente",
    "informativo": "Información de su expediente",
}


def enviar_correo(paciente_email, tipo, texto):
    """Envía un correo real. El destino SIEMPRE es el buzón de pruebas, nunca el email del paciente."""
    asunto = ASUNTOS.get(tipo, "Información de su expediente")
    try:
        resend.Emails.send({
            "from": "Anisa <onboarding@resend.dev>",
            "to": EMAIL_DEMO_DESTINO,
            "subject": f"[DEMO] {asunto}",
            "html": (
                f"<p><em>En un sistema real, esto iría dirigido a: {escape(paciente_email or '')}</em></p>"
                f"<p>{escape(texto)}</p>"
            ),
        })
        return "enviado"
    except Exception as error:
        print(f"Error enviando correo: {error}")
        return "fallido"
