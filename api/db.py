from datetime import datetime, timedelta

from api.models_orm import Auditoria, Cita, Mensaje, Pago, Paciente, Usuario

from api.correo import enviar_correo

def _paciente_a_dict(p):
    return {
        "id": p.id, "nombre": p.nombre, "pais": p.pais, "idioma": p.idioma,
        "pasaporte": p.pasaporte, "telefono": p.telefono, "email": p.email,
        "aseguradora": p.aseguradora, "fecha_nacimiento": p.fecha_nacimiento,
    }


def _cita_a_dict(c):
    return {
        "id": c.id, "paciente_id": c.paciente_id, "fecha": c.fecha,
        "especialidad": c.especialidad, "medico": c.medico, "estado": c.estado,
        "paciente_nombre": c.paciente.nombre if c.paciente else None,
    }


def _pago_a_dict(p):
    return {
        "id": p.id, "paciente_id": p.paciente_id, "concepto": p.concepto,
        "importe": p.importe, "estado": p.estado, "fecha_emision": p.fecha_emision,
        "paciente_nombre": p.paciente.nombre if p.paciente else None,
    }


def _mensaje_a_dict(m):
    return {
        "id": m.id, "paciente_id": m.paciente_id, "tipo": m.tipo,
        "idioma": m.idioma, "texto": m.texto, "enviado_en": m.enviado_en,
        "estado_envio": m.estado_envio,
    }


def buscar_pacientes(db, nombre):
    pacientes = (
        db.query(Paciente)
        .filter(Paciente.nombre.ilike(f"%{nombre}%"))
        .order_by(Paciente.nombre)
        .all()
    )
    return [_paciente_a_dict(p) for p in pacientes]


def obtener_paciente(db, paciente_id):
    paciente = db.query(Paciente).filter(Paciente.id == paciente_id).first()
    return _paciente_a_dict(paciente) if paciente else None


def citas_de_paciente(db, paciente_id):
    citas = (
        db.query(Cita)
        .filter(Cita.paciente_id == paciente_id)
        .order_by(Cita.fecha)
        .all()
    )
    return [_cita_a_dict(c) for c in citas]


def citas_proximas(db, dias):
    ahora = datetime.now().strftime("%Y-%m-%d %H:%M")
    limite = (datetime.now() + timedelta(days=dias)).strftime("%Y-%m-%d %H:%M")
    citas = (
        db.query(Cita)
        .filter(Cita.estado == "programada")
        .filter(Cita.fecha >= ahora)
        .filter(Cita.fecha <= limite)
        .order_by(Cita.fecha)
        .all()
    )
    return [_cita_a_dict(c) for c in citas]


def pagos_pendientes(db):
    pagos = (
        db.query(Pago)
        .filter(Pago.estado == "pendiente")
        .order_by(Pago.importe.desc())
        .all()
    )
    return [_pago_a_dict(p) for p in pagos]


def registrar_mensaje(db, paciente_id, tipo, idioma, texto):
    paciente = db.query(Paciente).filter(Paciente.id == paciente_id).first()
    estado_envio = enviar_correo(paciente.email, tipo, f"<p>{texto}</p>") if paciente else "fallido"

    mensaje = Mensaje(
        paciente_id=paciente_id,
        tipo=tipo,
        idioma=idioma,
        texto=texto,
        enviado_en=datetime.now().strftime("%Y-%m-%d %H:%M"),
        estado_envio=estado_envio,
    )
    db.add(mensaje)
    db.commit()
    return _mensaje_a_dict(mensaje)



def mensajes_de_paciente(db, paciente_id):
    mensajes = (
        db.query(Mensaje)
        .filter(Mensaje.paciente_id == paciente_id)
        .order_by(Mensaje.enviado_en.desc())
        .all()
    )
    return [_mensaje_a_dict(m) for m in mensajes]


def verificar_identidad(db, nombre, fecha_nacimiento):
    paciente = (
        db.query(Paciente)
        .filter(Paciente.nombre == nombre)
        .filter(Paciente.fecha_nacimiento == str(fecha_nacimiento))
        .first()
    )
    return paciente is not None


def buscar_disponibilidad(db, especialidad):
    cita = (
        db.query(Cita)
        .filter(Cita.especialidad == especialidad)
        .filter(Cita.estado == "programada")
        .order_by(Cita.fecha)
        .first()
    )
    return {"medico": cita.medico, "fecha": cita.fecha} if cita else None

def _auditoria_a_dict(a):
    return {
        "id": a.id,
        "usuario_id": a.usuario_id,
        "usuario_nombre": a.usuario.nombre if a.usuario else None,
        "pregunta": a.pregunta,
        "respuesta": a.respuesta,
        "pasos": a.pasos,
        "creado_en": a.creado_en,
    }


def registrar_auditoria(db, usuario_id, pregunta, respuesta, pasos):
    registro = Auditoria(
        usuario_id=usuario_id,
        pregunta=pregunta,
        respuesta=respuesta,
        pasos=pasos,
        creado_en=datetime.now().strftime("%Y-%m-%d %H:%M"),
    )
    db.add(registro)
    db.commit()
    return _auditoria_a_dict(registro)


def listar_auditoria(db, limite=100):
    registros = db.query(Auditoria).order_by(Auditoria.id.desc()).limit(limite).all()
    return [_auditoria_a_dict(a) for a in registros]


def obtener_usuario_por_email(db, email):
    return db.query(Usuario).filter(Usuario.email == email).first()

def actualizar_cita(db, cita_id, accion, nueva_fecha=None):
    cita = db.query(Cita).filter(Cita.id == cita_id).first()
    if cita is None:
        return None
    if accion == "cancelar":
        cita.estado= "cancelada"
    elif accion == "reprogramar":
        cita.estado= "programada"
        if nueva_fecha:
            cita.fecha = nueva_fecha
    db.commit()
    return _cita_a_dict(cita)