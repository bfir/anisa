from dataclasses import dataclass, field
from enum import Enum

from api import db
from api.extraccion import extraer_solicitud_cita
from api.modelos import SolicitudCita

MAX_PASOS = 8


class Estado(str, Enum):
    INICIO = "INICIO"
    RECOGER_IDENTIDAD = "RECOGER_IDENTIDAD"
    VERIFICAR_IDENTIDAD = "VERIFICAR_IDENTIDAD"
    RECOGER_SOLICITUD = "RECOGER_SOLICITUD"
    EJECUTAR_HERRAMIENTA = "EJECUTAR_HERRAMIENTA"
    CONFIRMAR = "CONFIRMAR"
    ESCALAR = "ESCALAR"
    FIN = "FIN"


@dataclass
class ConversationState:
    estado: Estado = Estado.INICIO
    solicitud: SolicitudCita = field(default_factory=SolicitudCita)
    identidad_verificada: bool = False
    pasos_dados: int = 0
    razon_escalado: str | None = None
    disponibilidad: dict | None = None


def _fusionar(solicitud: SolicitudCita, nueva: SolicitudCita) -> SolicitudCita:
    """Combina lo ya sabido con lo nuevo, sin borrar datos con None."""
    datos = solicitud.model_dump()
    for campo, valor in nueva.model_dump().items():
        if valor is not None and valor is not False:
            datos[campo] = valor
    return SolicitudCita(**datos)


def procesar_turno(state: ConversationState, texto_usuario: str, cliente, modelo) -> tuple[ConversationState, str]:
    state.pasos_dados += 1
    if state.pasos_dados > MAX_PASOS:
        state.estado = Estado.ESCALAR
        state.razon_escalado = "tool_error"
        return state, "Esto se está complicando más de lo normal, te paso con una persona del equipo."

    nueva_info, errores_extraccion = extraer_solicitud_cita(cliente, modelo, texto_usuario)
    state.solicitud = _fusionar(state.solicitud, nueva_info)
    if state.solicitud.categoria in ("clinical_advice", "urgent", "out_of_scope"):
        state.estado = Estado.ESCALAR
        state.razon_escalado = (
            "urgency" if state.solicitud.categoria == "urgent" else state.solicitud.categoria
        )
        return state, "Esto no lo puedo gestionar yo directamente. Te paso con una persona del equipo."

    if state.solicitud.urgencia_detectada:
        state.estado = Estado.ESCALAR
        state.razon_escalado = "urgency"
        return state, "Esto suena urgente. Te voy a poner en contacto con una persona ahora mismo."

    if state.estado == Estado.INICIO:
        state.estado = Estado.RECOGER_IDENTIDAD

    if state.estado == Estado.RECOGER_IDENTIDAD:
        if state.solicitud.nombre and state.solicitud.fecha_nacimiento:
            state.estado = Estado.VERIFICAR_IDENTIDAD
        else:
            faltan = []
            if not state.solicitud.nombre:
                faltan.append("tu nombre completo")
            if not state.solicitud.fecha_nacimiento:
                faltan.append("tu fecha de nacimiento")
            return state, f"Antes de continuar, ¿me confirmas {' y '.join(faltan)}?"

    if state.estado == Estado.VERIFICAR_IDENTIDAD:
        ok = db.verificar_identidad(state.solicitud.nombre, state.solicitud.fecha_nacimiento)
        if not ok:
            state.estado = Estado.ESCALAR
            state.razon_escalado = "identity_failed"
            return state, "No he podido verificar tu identidad con esos datos. Te paso con una persona del equipo."
        state.identidad_verificada = True
        state.estado = Estado.RECOGER_SOLICITUD

    if state.estado == Estado.RECOGER_SOLICITUD:
        if state.solicitud.especialidad and state.solicitud.fecha_preferida:
            state.estado = Estado.EJECUTAR_HERRAMIENTA
        else:
            faltan = []
            if not state.solicitud.especialidad:
                faltan.append("la especialidad")
            if not state.solicitud.fecha_preferida:
                faltan.append("una fecha aproximada")
            return state, f"Identidad verificada. ¿Me dices {' y '.join(faltan)}?"

    if state.estado == Estado.EJECUTAR_HERRAMIENTA:
        disponibilidad = db.buscar_disponibilidad(state.solicitud.especialidad.value)
        if disponibilidad is None:
            state.estado = Estado.ESCALAR
            state.razon_escalado = "tool_error"
            return state, "No encuentro hueco disponible ahora mismo. Te paso con una persona del equipo."
        state.disponibilidad = disponibilidad
        state.estado = Estado.CONFIRMAR

    if state.estado == Estado.CONFIRMAR:
        state.estado = Estado.FIN
        return state, (
            f"Tengo disponibilidad con {state.disponibilidad['medico']} "
            f"el {state.disponibilidad['fecha']}. ¿Confirmo la cita?"
        )

    return state, "Gracias, ¿necesitas algo más?"
