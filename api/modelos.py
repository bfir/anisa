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