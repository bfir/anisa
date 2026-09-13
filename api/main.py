from fastapi import FastAPI, HTTPException

from api import db

from api import agente


from api.modelos import Paciente, Cita, Pago, MensajeNuevo, Mensaje, PreguntaAgente, RespuestaAgente


app = FastAPI(title="Anisa API")

@app.get("/")

def raiz():
    return {"servicio": "Anisa API", "estado": "ok"}

@app.get("/pacientes/buscar", response_model=list[Paciente])
def buscar_pacientes(nombre: str):
    return db.buscar_pacientes(nombre)

@app.get("/pacientes/{paciente_id}/citas", response_model= list[Cita])
def citas_de_paciente(paciente_id: int):
    paciente = db.obtener_paciente(paciente_id)
    if paciente is None:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return db.citas_de_paciente(paciente_id)
    
@app.get("/citas/proximas", response_model=list[Cita])
def citas_proximas(dias: int= 7):
    return db.citas_proximas(dias)

@app.get("/pagos/pendientes", response_model=list[Pago])
def pagos_pendientes():
    return db.pagos_pendientes()

@app.post("/mensajes", response_model=Mensaje)
def enviar_mensaje(mensaje: MensajeNuevo):
    paciente = db.obtener_paciente(mensaje.paciente_id)
    if paciente is None:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return db.registrar_mensaje(
        mensaje.paciente_id, mensaje.tipo, mensaje.idioma, mensaje.texto
    )
@app.get("/pacientes/{paciente_id}/mensajes", response_model=list[Mensaje])
def mensajes_de_paciente(paciente_id: int):
    return db.mensajes_de_paciente(paciente_id)

@app.post("/agente", response_model=RespuestaAgente)
def preguntar_al_agente(cuerpo: PreguntaAgente):
    respuesta, pasos = agente.preguntar(cuerpo.pregunta)
    return {"respuesta": respuesta, "pasos": pasos}
