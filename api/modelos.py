from datetime import datetime

from pydantic import BaseModel, Field, model_validator
from typing import Literal

class Paciente(BaseModel):
    id: int
    nombre: str
    pais: str
    idioma: str
    pasaporte: str
    telefono: str
    email: str
    aseguradora: str
    
class Cita(BaseModel):
    id: int
    paciente_id: int
    fecha: str
    especialidad: str
    medico: str
    estado: str
    paciente_nombre: str | None = None
    
class Pago(BaseModel):
    id: int
    paciente_id: int
    concepto: str
    importe: float
    estado: str
    fecha_emision: str
    paciente_nombre: str | None = None

class MensajeNuevo(BaseModel):
    paciente_id: int
    tipo: str
    idioma: str
    texto: str

class Mensaje(MensajeNuevo):
    id: int
    enviado_en: str
    estado_envio: str | None = None

    
class PreguntaAgente(BaseModel):
    pregunta: str
    idioma: Literal["es", "en", "ar", "fr"] = "es"


class RespuestaAgente(BaseModel):
    respuesta: str
    pasos: list[dict]
    error: bool = False
    acciones: list["AccionPropuesta"] = Field(default_factory=list)


class MensajePropuesto(MensajeNuevo):
    paciente_id: int = Field(gt=0)
    tipo: Literal["recordatorio_cita", "pago_pendiente", "informativo"]
    idioma: Literal["es", "en", "ar", "fr"]
    texto: str = Field(min_length=1, max_length=8000)


class CitaPropuesta(BaseModel):
    cita_id: int = Field(gt=0)
    accion: Literal["reprogramar", "cancelar"]
    nueva_fecha: str | None = None

    @model_validator(mode="after")
    def validar_fecha(self):
        if self.accion == "reprogramar":
            if not self.nueva_fecha:
                raise ValueError("Falta la nueva fecha")
            fecha = datetime.strptime(self.nueva_fecha, "%Y-%m-%d %H:%M")
            if fecha <= datetime.now():
                raise ValueError("La nueva fecha debe ser futura")
        else:
            self.nueva_fecha = None
        return self


class AccionPropuesta(BaseModel):
    id: int
    herramienta: Literal["enviar_mensaje", "modificar_cita"]
    argumentos: dict
    paciente: dict
    cita: dict | None = None
    estado: Literal["pendiente", "en_curso", "completada", "rechazada", "caducada", "fallida"]
    idioma: Literal["es", "en", "ar", "fr"]
    expira_en: str
    decidido_en: str | None = None
    resultado: dict | None = None


class DecisionAccion(BaseModel):
    decision: Literal["aprobar", "rechazar"]


class RegistroAuditoria(BaseModel):
    id: int
    usuario_id: int | None = None
    usuario_nombre: str | None = None
    pregunta: str
    respuesta: str | None = None
    pasos: list[dict]
    creado_en: str

class Token(BaseModel):
    access_token: str
    token_type: str


class UsuarioOut(BaseModel):
    id: int
    nombre: str
    email: str
    rol: str

class CitaActualizar(BaseModel):
    accion: Literal["reprogramar", "cancelar"]
    nueva_fecha: str | None = None
