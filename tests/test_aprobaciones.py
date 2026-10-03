import json
from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from api import agente, aprobaciones, db as db_module
from api.auth import get_current_user
from api.database import Base, get_db
from api.main import app
from api.models_orm import Auditoria, Cita, Mensaje, Paciente, Usuario


@pytest.fixture
def db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        session.add_all([
            Usuario(id=1, nombre="Admin", email="admin@example.test", rol="admin", password_hash="unused"),
            Usuario(id=2, nombre="Coordinación", email="coord@example.test", rol="coordinador", password_hash="unused"),
            Usuario(id=3, nombre="Lectura", email="read@example.test", rol="lector", password_hash="unused"),
            Paciente(id=1, nombre="Fátima", email="fatima@example.test", idioma="ar"),
            Cita(id=1, paciente_id=1, fecha=(datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d %H:%M"),
                 estado="programada", medico="Doctora Demo", especialidad="Revisión"),
        ])
        session.commit()
        yield session
    engine.dispose()


def mensaje(db, usuario_id=1):
    return aprobaciones.proponer(db, usuario_id, "Prepara un recordatorio", "en", "enviar_mensaje", {
        "paciente_id": 1, "tipo": "recordatorio_cita", "idioma": "ar", "texto": "نذكرك بموعدك",
    })


def test_proponer_no_envia_y_persiste_sin_duplicar(db, monkeypatch):
    llamadas = []
    monkeypatch.setattr(db_module, "enviar_correo", lambda *args: llamadas.append(args))
    propuesta = mensaje(db)
    assert mensaje(db)["id"] == propuesta["id"]
    assert llamadas == []
    assert db.query(Mensaje).count() == 0
    db.expire_all()
    assert aprobaciones.listar(db, 1)[0].argumentos["texto"] == "نذكرك بموعدك"


def test_modelo_solo_propone_y_no_afirma_envio(db, monkeypatch):
    llamadas = []
    argumentos = {"paciente_id": 1, "tipo": "informativo", "idioma": "ar", "texto": "مرحباً"}
    llamada = SimpleNamespace(id="tool-1", function=SimpleNamespace(
        name="enviar_mensaje", arguments=json.dumps(argumentos),
    ))
    def responder(**datos):
        llamadas.append(datos)
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(
            content="Ya he enviado el correo", tool_calls=[llamada],
        ))])
    monkeypatch.setattr(agente.cliente.chat.completions, "create", responder)
    respuesta, pasos = agente.preguntar("Recordatorio", db, "en", usuario_id=1)
    assert "No messages have been sent" in respuesta
    assert len(llamadas) == 1
    assert pasos[0]["resultado"]["estado"] == "pendiente"
    assert db.query(Mensaje).count() == 0


def test_descartar_no_ejecuta_ni_permite_reaprobacion(db):
    propuesta = mensaje(db)
    assert aprobaciones.decidir(db, 1, propuesta["id"], "rechazar").estado == "rechazada"
    with pytest.raises(HTTPException) as error:
        aprobaciones.decidir(db, 1, propuesta["id"], "aprobar")
    assert error.value.status_code == 409
    assert db.query(Mensaje).count() == 0


@pytest.mark.parametrize("estado_envio", ["enviado", "fallido"])
def test_aprobar_envia_una_sola_vez_y_conserva_resultado(db, monkeypatch, estado_envio):
    llamadas = []
    def enviar(*args):
        llamadas.append(args)
        return estado_envio
    monkeypatch.setattr(db_module, "enviar_correo", enviar)
    propuesta = mensaje(db)
    resultado = aprobaciones.decidir(db, 1, propuesta["id"], "aprobar")
    assert resultado.estado == ("completada" if estado_envio == "enviado" else "fallida")
    assert resultado.resultado["estado_envio"] == estado_envio
    with pytest.raises(HTTPException):
        aprobaciones.decidir(db, 1, propuesta["id"], "aprobar")
    assert len(llamadas) == 1
    assert db.query(Mensaje).count() == 1
    assert db.get(Auditoria, propuesta["id"]).pasos[0]["aprobacion"]["decidido_en"]


def test_propuesta_solo_visible_y_aprobable_por_su_propietario(db):
    propuesta = mensaje(db)
    assert aprobaciones.listar(db, 2) == []
    for operacion in (
        lambda: aprobaciones.obtener(db, 2, propuesta["id"]),
        lambda: aprobaciones.decidir(db, 2, propuesta["id"], "aprobar"),
    ):
        with pytest.raises(HTTPException) as error:
            operacion()
        assert error.value.status_code == 404
    assert aprobaciones.obtener(db, 1, propuesta["id"]).estado == "pendiente"


def test_caducada_no_ejecuta(db):
    propuesta = mensaje(db)
    registro = db.get(Auditoria, propuesta["id"])
    expirada = aprobaciones.obtener(db, 1, propuesta["id"])
    expirada.expira_en = "2000-01-01T00:00:00"
    aprobaciones._guardar(registro, expirada)
    db.commit()
    assert aprobaciones.listar(db, 1) == []
    with pytest.raises(HTTPException) as error:
        aprobaciones.decidir(db, 1, propuesta["id"], "aprobar")
    assert error.value.status_code == 409
    assert db.query(Mensaje).count() == 0


@pytest.mark.parametrize("accion", ["cancelar", "reprogramar"])
def test_cita_se_modifica_solo_al_aprobar(db, accion):
    fecha_original = db.get(Cita, 1).fecha
    nueva_fecha = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d %H:%M")
    propuesta = aprobaciones.proponer(db, 1, "Cambiar cita", "es", "modificar_cita", {
        "cita_id": 1, "accion": accion, "nueva_fecha": nueva_fecha,
    })
    assert db.get(Cita, 1).fecha == fecha_original
    assert db.get(Cita, 1).estado == "programada"
    resultado = aprobaciones.decidir(db, 1, propuesta["id"], "aprobar")
    assert resultado.estado == "completada"
    assert db.get(Cita, 1).estado == ("cancelada" if accion == "cancelar" else "programada")
    assert db.get(Cita, 1).fecha == (fecha_original if accion == "cancelar" else nueva_fecha)


def test_cita_modificada_despues_de_proponer_no_se_sobrescribe(db):
    propuesta = aprobaciones.proponer(db, 1, "Cancelar", "es", "modificar_cita", {"cita_id": 1, "accion": "cancelar"})
    db.get(Cita, 1).fecha = "2030-01-01 10:00"
    db.commit()
    assert aprobaciones.decidir(db, 1, propuesta["id"], "aprobar").estado == "fallida"
    assert db.get(Cita, 1).estado == "programada"
    assert db.get(Cita, 1).fecha == "2030-01-01 10:00"


def test_reprogramacion_sin_fecha_valida_no_crea_propuesta(db):
    with pytest.raises(ValidationError):
        aprobaciones.proponer(db, 1, "Cambiar", "es", "modificar_cita", {"cita_id": 1, "accion": "reprogramar"})
    assert db.query(Auditoria).count() == 0


def test_aprobacion_interrumpida_no_repite_el_envio(db, monkeypatch):
    class Interrupcion(BaseException):
        pass
    llamadas = []
    def interrumpir(*args):
        llamadas.append(args)
        raise Interrupcion()
    monkeypatch.setattr(db_module, "enviar_correo", interrumpir)
    propuesta = mensaje(db)
    with pytest.raises(Interrupcion):
        aprobaciones.decidir(db, 1, propuesta["id"], "aprobar")
    assert aprobaciones.obtener(db, 1, propuesta["id"]).estado == "en_curso"
    db.expire_all()
    assert aprobaciones.listar(db, 1)[0].estado == "en_curso"
    with pytest.raises(ValueError):
        mensaje(db)
    with pytest.raises(HTTPException):
        aprobaciones.decidir(db, 1, propuesta["id"], "aprobar")
    assert len(llamadas) == 1


def test_api_restringe_rol_y_no_acepta_argumentos_del_cliente(db, monkeypatch):
    propuesta = mensaje(db)
    llamadas = []
    monkeypatch.setattr(db_module, "enviar_correo", lambda *args: llamadas.append(args) or "enviado")
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: db.get(Usuario, 3)
    try:
        with TestClient(app) as client:
            ruta = f"/agente/acciones/{propuesta['id']}"
            assert client.post(ruta, json={"decision": "aprobar"}).status_code == 403
            app.dependency_overrides[get_current_user] = lambda: db.get(Usuario, 2)
            assert client.get(ruta).status_code == 404
            app.dependency_overrides[get_current_user] = lambda: db.get(Usuario, 1)
            respuesta = client.post(ruta, json={
                "decision": "aprobar", "argumentos": {"paciente_id": 999, "texto": "Otro texto"},
            })
            assert respuesta.status_code == 200
            assert respuesta.json()["estado"] == "completada"
            assert llamadas[0] == ("fatima@example.test", "recordatorio_cita", "نذكرك بموعدك")
            assert client.post(ruta, json={"decision": "aprobar"}).status_code == 409
    finally:
        app.dependency_overrides.clear()
