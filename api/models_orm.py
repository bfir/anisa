from sqlalchemy import Column, Integer, String, Float, ForeignKey
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

