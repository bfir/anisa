from sqlalchemy import Column, Integer, String, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship

from api.database import Base

class Paciente(Base):
    __tablename__ = "pacientes"
    
    id= Column(Integer, primary_key=True)
    nombre = Column(String)
    idioma = Column(String)
    pasaporte= Column(String)
    pais= Column(String)
    telefono= Column(String)
    email= Column(String)
    aseguradora=Column(String)
    fecha_nacimiento= Column(String)
    
class Cita(Base):
    __tablename__="citas"
    
    id= Column(Integer, primary_key=True)
    paciente_id= Column(Integer, ForeignKey("pacientes.id"))
    fecha= Column(String)
    especialidad = Column(String)
    medico= Column(String)
    estado= Column(String)
    paciente= relationship("Paciente")
    


class Pago(Base):
    __tablename__="pagos"
    
    id= Column(Integer, primary_key=True)
    paciente_id= Column(Integer, ForeignKey("pacientes.id"))
    concepto=  Column(String)
    importe= Column(Float)
    estado = Column(String)
    fecha_emision= Column(String)
    paciente = relationship("Paciente")
    

class Mensaje(Base):
    __tablename__ = "mensajes"
    id = Column(Integer, primary_key=True)
    paciente_id = Column(Integer, ForeignKey("pacientes.id"))
    tipo = Column(String)
    idioma = Column(String)
    texto = Column(String)
    enviado_en = Column(String)
    estado_envio = Column(String, nullable=True)   # <- nueva

    

class Usuario(Base):
    __tablename__="usuarios"
    id = Column(Integer, primary_key=True)
    nombre= Column(String)
    email= Column(String)
    password_hash= Column(String)
    rol=  Column(String)


class Auditoria(Base):
    """Registro permanente de cada pregunta hecha al agente: quién, qué pidió,
    qué herramientas ejecutó y qué respondió. Es el histórico que faltaba
    cuando 'pasos' solo viajaba en la respuesta HTTP y se perdía al cerrar el chat."""
    __tablename__ = "auditoria"
    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    pregunta = Column(String)
    respuesta = Column(String)
    pasos = Column(JSON)
    creado_en = Column(String)
    usuario = relationship("Usuario")

