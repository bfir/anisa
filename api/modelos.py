from pydantic import BaseModel


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
    
class PreguntaAgente(BaseModel):
    pregunta: str


class RespuestaAgente(BaseModel):
    respuesta: str
    pasos: list[dict]

from datetime import date
from enum import Enum

class Especialidad(str, Enum):
    cardiologia = "Cardiología"
    traumatologia= "Traumatología"
    dermatologia = "Dermatología"
    oftalmologia = "Oftalmología"
    ginecologia = "Ginecología"
    neurologia = "Neurología"

class Franja(str, Enum):
    manana = "mañana"
    tarde = "tarde"
    cualquiera = "cualquiera"

class SolicitudCita(BaseModel):
    nombre: str | None= None
    fecha_nacimiento: date | None = None
    aseguradora: str| None = None
    especialidad: Especialidad | None = None
    fecha_preferida: date | None=None
    idioma: str | None= None
    motivo_administrativo: str | None = None
    urgencia_detectada: bool = False
    categoria: str | None = None   # "administrative", "clinical_advice", "urgent", "out_of_scope"

    