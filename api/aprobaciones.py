from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from api import db as db_module
from api.modelos import AccionPropuesta, CitaPropuesta, MensajePropuesto
from api.models_orm import Auditoria, Cita, Usuario

HERRAMIENTAS_ACCION = {"enviar_mensaje", "modificar_cita"}


def _ahora():
    return datetime.utcnow().isoformat(timespec="seconds")


def _pendientes(db, usuario_id):
    return db.query(Auditoria).filter(
        Auditoria.usuario_id == usuario_id,
        Auditoria.pasos[0]["aprobacion"]["estado"].as_string() == "pendiente",
    )


def _abiertas(db, usuario_id):
    estado = Auditoria.pasos[0]["aprobacion"]["estado"].as_string()
    return db.query(Auditoria).filter(
        Auditoria.usuario_id == usuario_id,
        (estado == "en_curso") | (
            (estado == "pendiente")
            & (Auditoria.pasos[0]["aprobacion"]["expira_en"].as_string() > _ahora())
        ),
    )


def _propuesta(registro):
    return AccionPropuesta.model_validate(registro.pasos[0]["aprobacion"])


def _guardar(registro, propuesta, error=None):
    registro.pasos = [{
        "herramienta": propuesta.herramienta,
        "argumentos": propuesta.argumentos,
        "resultado": propuesta.resultado,
        "error": error,
        "aprobacion": propuesta.model_dump(),
    }]
    registro.respuesta = f"Aprobación: {propuesta.estado}"


def proponer(db: Session, usuario_id, pregunta, idioma, herramienta, argumentos):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if usuario is None or usuario.rol not in ("admin", "coordinador"):
        raise ValueError("La acción requiere un operador identificado")

    cita = None
    if herramienta == "enviar_mensaje":
        cambio = MensajePropuesto.model_validate(argumentos)
        if not cambio.texto.strip():
            raise ValueError("El mensaje está vacío")
        paciente_id = cambio.paciente_id
    elif herramienta == "modificar_cita":
        cambio = CitaPropuesta.model_validate(argumentos)
        cita_orm = db.query(Cita).filter(Cita.id == cambio.cita_id).first()
        if cita_orm is None or cita_orm.estado != "programada":
            raise ValueError("La cita no existe o ya no está programada")
        cita = db_module._cita_a_dict(cita_orm)
        paciente_id = cita_orm.paciente_id
    else:
        raise ValueError("Herramienta no aprobable")

    paciente = db_module.obtener_paciente(db, paciente_id)
    if paciente is None:
        raise ValueError("El paciente no existe")
    paciente = {clave: paciente[clave] for clave in ("id", "nombre", "email", "idioma")}
    argumentos = cambio.model_dump()
    for registro in _abiertas(db, usuario_id).order_by(Auditoria.id.desc()).limit(100):
        anterior = _propuesta(registro)
        if anterior.estado == "en_curso" and anterior.herramienta == herramienta and anterior.argumentos == argumentos:
            raise ValueError("Hay una acción igual en curso; comprueba su estado")
        if (
            anterior.expira_en > _ahora()
            and anterior.herramienta == herramienta
            and anterior.argumentos == argumentos
            and anterior.paciente == paciente
            and anterior.cita == cita
        ):
            return anterior.model_dump()

    registro = Auditoria(
        usuario_id=usuario_id, pregunta=pregunta,
        creado_en=datetime.now().strftime("%Y-%m-%d %H:%M"),
    )
    db.add(registro)
    db.flush()
    propuesta = AccionPropuesta(
        id=registro.id, herramienta=herramienta, argumentos=argumentos,
        paciente=paciente, cita=cita, estado="pendiente", idioma=idioma,
        expira_en=(datetime.utcnow() + timedelta(minutes=15)).isoformat(timespec="seconds"),
    )
    _guardar(registro, propuesta)
    db.commit()
    return propuesta.model_dump()


def obtener(db: Session, usuario_id, accion_id):
    registro = db.query(Auditoria).filter(
        Auditoria.id == accion_id, Auditoria.usuario_id == usuario_id,
    ).first()
    if registro is None or not registro.pasos or "aprobacion" not in registro.pasos[0]:
        raise HTTPException(status_code=404, detail="Propuesta no encontrada")
    propuesta = _propuesta(registro)
    if propuesta.estado == "pendiente" and propuesta.expira_en <= _ahora():
        propuesta.estado = "caducada"
    return propuesta


def listar(db: Session, usuario_id):
    return [
        _propuesta(registro)
        for registro in _abiertas(db, usuario_id).order_by(Auditoria.id.desc()).limit(100)
    ]


def decidir(db: Session, usuario_id, accion_id, decision):
    propuesta = obtener(db, usuario_id, accion_id)
    if propuesta.estado != "pendiente":
        raise HTTPException(status_code=409, detail="La propuesta ya no está pendiente")
    propuesta.estado = "rechazada" if decision == "rechazar" else "en_curso"
    propuesta.decidido_en = _ahora()
    pasos = [{
        "herramienta": propuesta.herramienta, "argumentos": propuesta.argumentos,
        "resultado": None, "error": None, "aprobacion": propuesta.model_dump(),
    }]
    reclamadas = _pendientes(db, usuario_id).filter(
        Auditoria.id == accion_id,
        Auditoria.pasos[0]["aprobacion"]["expira_en"].as_string() > _ahora(),
    ).update({
        Auditoria.pasos: pasos, Auditoria.respuesta: f"Aprobación: {propuesta.estado}",
    }, synchronize_session=False)
    db.commit()
    if reclamadas != 1:
        raise HTTPException(status_code=409, detail="La propuesta ya no está pendiente")
    if decision == "rechazar":
        return propuesta

    try:
        paciente = db_module.obtener_paciente(db, propuesta.paciente["id"])
        if paciente is None or any(paciente[clave] != valor for clave, valor in propuesta.paciente.items()):
            raise ValueError("El paciente ha cambiado; solicita una nueva propuesta")
        if propuesta.herramienta == "enviar_mensaje":
            propuesta.resultado = db_module.registrar_mensaje(db, **propuesta.argumentos)
            propuesta.estado = "completada" if propuesta.resultado["estado_envio"] == "enviado" else "fallida"
        else:
            cambio = CitaPropuesta.model_validate(propuesta.argumentos)
            esperada = propuesta.cita
            actualizadas = db.query(Cita).filter(
                Cita.id == cambio.cita_id, Cita.paciente_id == esperada["paciente_id"],
                Cita.fecha == esperada["fecha"], Cita.estado == esperada["estado"],
                Cita.medico == esperada["medico"], Cita.especialidad == esperada["especialidad"],
            ).update({
                "estado": "cancelada" if cambio.accion == "cancelar" else "programada",
                "fecha": esperada["fecha"] if cambio.accion == "cancelar" else cambio.nueva_fecha,
            }, synchronize_session=False)
            if actualizadas != 1:
                raise ValueError("La cita ha cambiado; solicita una nueva propuesta")
            db.commit()
            propuesta.resultado = db_module._cita_a_dict(db.get(Cita, cambio.cita_id))
            propuesta.estado = "completada"
        error = None if propuesta.estado == "completada" else "No se ha enviado el correo"
    except Exception:
        db.rollback()
        propuesta.estado = "fallida"
        error = "No se ha confirmado la acción; revisa los datos antes de solicitar otra"
    registro = db.get(Auditoria, accion_id)
    _guardar(registro, propuesta, error)
    db.commit()
    return propuesta
