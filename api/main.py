from dotenv import load_dotenv
load_dotenv()

from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

from api import db as db_module
from api import agente
from api.database import get_db
from api.modelos import Paciente, Cita, Pago, MensajeNuevo, Mensaje, PreguntaAgente, RespuestaAgente


app = FastAPI(title="Anisa API")


@app.get("/")
def raiz():
    return {"servicio": "Anisa API", "estado": "ok"}


@app.get("/pacientes/buscar", response_model=list[Paciente])
def buscar_pacientes(nombre: str, db: Session = Depends(get_db)):
    return db_module.buscar_pacientes(db, nombre)


@app.get("/pacientes/{paciente_id}/citas", response_model=list[Cita])
def citas_de_paciente(paciente_id: int, db: Session = Depends(get_db)):
    paciente = db_module.obtener_paciente(db, paciente_id)
    if paciente is None:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return db_module.citas_de_paciente(db, paciente_id)


@app.get("/citas/proximas", response_model=list[Cita])
def citas_proximas(dias: int = 7, db: Session = Depends(get_db)):
    return db_module.citas_proximas(db, dias)


@app.get("/pagos/pendientes", response_model=list[Pago])
def pagos_pendientes(db: Session = Depends(get_db)):
    return db_module.pagos_pendientes(db)


@app.post("/mensajes", response_model=Mensaje)
def enviar_mensaje(mensaje: MensajeNuevo, db: Session = Depends(get_db)):
    paciente = db_module.obtener_paciente(db, mensaje.paciente_id)
    if paciente is None:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return db_module.registrar_mensaje(
        db, mensaje.paciente_id, mensaje.tipo, mensaje.idioma, mensaje.texto
    )


@app.get("/pacientes/{paciente_id}/mensajes", response_model=list[Mensaje])
def mensajes_de_paciente(paciente_id: int, db: Session = Depends(get_db)):
    return db_module.mensajes_de_paciente(db, paciente_id)


@app.post("/agente", response_model=RespuestaAgente)
def preguntar_al_agente(cuerpo: PreguntaAgente, db: Session = Depends(get_db)):
    respuesta, pasos = agente.preguntar(cuerpo.pregunta, db)
    return {"respuesta": respuesta, "pasos": pasos}



@app.get("/pacientes/{paciente_id}", response_model=Paciente)
def obtener_paciente(paciente_id: int, db: Session = Depends(get_db)):
    paciente = db_module.obtener_paciente(db, paciente_id)
    if paciente is None:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return paciente
