from types import SimpleNamespace

import pytest

from api import agente
from api.modelos import PreguntaAgente


def respuesta_final(texto):
    mensaje = SimpleNamespace(content=texto, tool_calls=None)
    return SimpleNamespace(choices=[SimpleNamespace(message=mensaje)])


def test_pregunta_antigua_usa_espanol(monkeypatch):
    cuerpo = PreguntaAgente(pregunta="Hola")
    llamadas = []

    def responder(**argumentos):
        llamadas.append(argumentos)
        return respuesta_final("Hola")

    monkeypatch.setattr(agente.cliente.chat.completions, "create", responder)
    respuesta, pasos = agente.preguntar(cuerpo.pregunta, object(), idioma=cuerpo.idioma)

    assert respuesta == "Hola"
    assert pasos == []
    assert "español" in llamadas[0]["messages"][0]["content"]


@pytest.mark.parametrize(("idioma", "nombre"), [("en", "inglés"), ("ar", "árabe"), ("fr", "francés")])
def test_agente_recibe_el_idioma_solicitado(monkeypatch, idioma, nombre):
    llamadas = []

    def responder(**argumentos):
        llamadas.append(argumentos)
        return respuesta_final("Respuesta")

    monkeypatch.setattr(agente.cliente.chat.completions, "create", responder)
    agente.preguntar("Pregunta", object(), idioma=idioma)

    assert nombre in llamadas[0]["messages"][0]["content"]


def test_error_del_proveedor_no_expone_detalles(monkeypatch):
    def fallar(**_):
        raise RuntimeError("clave-secreta-proveedor")

    monkeypatch.setattr(agente.cliente.chat.completions, "create", fallar)
    with pytest.raises(agente.ErrorAgente) as error:
        agente.preguntar("Pregunta", object(), idioma="en")

    assert "clave-secreta-proveedor" not in str(error.value)
    assert "Check appointments and messages" in str(error.value)
