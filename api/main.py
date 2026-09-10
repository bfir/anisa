from fastapi import FastAPI, HTTPException

from api import db

from api.modelos import Paciente, Cita, Pago

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