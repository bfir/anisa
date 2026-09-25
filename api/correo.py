import os

import resend

resend.api_key = os.environ["RESEND_API_KEY"]
EMAIL_DEMO_DESTINO = os.environ["EMAIL_DEMO_DESTINO"]


def enviar_correo(paciente_email, asunto, cuerpo_html):
    """Envía un correo real. El destino SIEMPRE es el buzón de pruebas, nunca el email del paciente."""
    try:
        resend.Emails.send({
            "from": "Anisa <onboarding@resend.dev>",
            "to": EMAIL_DEMO_DESTINO,
            "subject": f"[DEMO] {asunto}",
            "html": (
                f"<p><em>En un sistema real, esto iría dirigido a: {paciente_email}</em></p>"
                f"{cuerpo_html}"
            ),
        })
        return "enviado"
    except Exception as error:
        print(f"Error enviando correo: {error}")
        return "fallido"
