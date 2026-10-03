from secrets import token_urlsafe
from uuid import uuid4

from dotenv import load_dotenv
load_dotenv()

from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

from api import db as db_module
from api import agente
from api import aprobaciones
from api.database import get_db
from api.modelos import (
    Paciente, Cita, Pago, MensajeNuevo, Mensaje,
    PreguntaAgente, RespuestaAgente, CitaActualizar, RegistroAuditoria,
    AccionPropuesta, DecisionAccion, ConfiguracionAcceso,
)

from fastapi.security import OAuth2PasswordRequestForm

from api.auth import (
    create_access_token, get_current_user, hash_password,
    puede_actuar, puede_auditar, public_demo_enabled, verify_password,
)
from api.modelos import Token, UsuarioOut
from api.models_orm import Usuario
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Anisa API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://anisa-rho.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def raiz():
    return {"servicio": "Anisa API", "estado": "ok"}


@app.get("/pacientes/buscar", response_model=list[Paciente])
def buscar_pacientes(nombre: str, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    return db_module.buscar_pacientes(db, nombre)


@app.get("/pacientes/{paciente_id}/citas", response_model=list[Cita])
def citas_de_paciente(paciente_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    paciente = db_module.obtener_paciente(db, paciente_id)
    if paciente is None:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return db_module.citas_de_paciente(db, paciente_id)


@app.get("/citas/proximas", response_model=list[Cita])
def citas_proximas(dias: int = 7, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    return db_module.citas_proximas(db, dias)


@app.get("/pagos/pendientes", response_model=list[Pago])
def pagos_pendientes(db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    return db_module.pagos_pendientes(db)


@app.post("/mensajes", response_model=Mensaje)
def enviar_mensaje(mensaje: MensajeNuevo, db: Session = Depends(get_db), usuario: Usuario = Depends(puede_actuar)):
    try:
        return db_module.registrar_mensaje(
            db, mensaje.paciente_id, mensaje.tipo, mensaje.idioma, mensaje.texto
        )
    except db_module.PacienteNoEncontrado:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")


@app.get("/pacientes/{paciente_id}/mensajes", response_model=list[Mensaje])
def mensajes_de_paciente(paciente_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    return db_module.mensajes_de_paciente(db, paciente_id)


@app.post("/agente", response_model=RespuestaAgente)
def preguntar_al_agente(cuerpo: PreguntaAgente, db: Session = Depends(get_db), usuario: Usuario = Depends(puede_actuar)):
    error = False
    try:
        respuesta, pasos = agente.preguntar(
            cuerpo.pregunta, db, idioma=cuerpo.idioma, usuario_id=usuario.id,
        )
    except agente.ErrorAgente as excepcion:
        respuesta = str(excepcion)
        pasos = excepcion.pasos
        error = True

    if any(paso["error"] for paso in pasos):
        error = True

    try:
        db_module.registrar_auditoria(db, usuario.id, cuerpo.pregunta, respuesta, pasos)
    except Exception:
        db.rollback()
        error = True

    acciones = [
        paso["resultado"] for paso in pasos
        if paso["herramienta"] in aprobaciones.HERRAMIENTAS_ACCION and paso["error"] is None
    ]
    return {"respuesta": respuesta, "pasos": pasos, "error": error, "acciones": acciones}


@app.get("/agente/acciones", response_model=list[AccionPropuesta])
def acciones_pendientes(db: Session = Depends(get_db), usuario: Usuario = Depends(puede_actuar)):
    return aprobaciones.listar(db, usuario.id)


@app.get("/agente/acciones/{accion_id}", response_model=AccionPropuesta)
def estado_accion(accion_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(puede_actuar)):
    return aprobaciones.obtener(db, usuario.id, accion_id)


@app.post("/agente/acciones/{accion_id}", response_model=AccionPropuesta)
def decidir_accion(
    accion_id: int, cuerpo: DecisionAccion,
    db: Session = Depends(get_db), usuario: Usuario = Depends(puede_actuar),
):
    return aprobaciones.decidir(db, usuario.id, accion_id, cuerpo.decision)


@app.get("/auditoria", response_model=list[RegistroAuditoria])
def historial_auditoria(db: Session = Depends(get_db), usuario: Usuario = Depends(puede_auditar)):
    return db_module.listar_auditoria(db)



@app.get("/pacientes/{paciente_id}", response_model=Paciente)
def obtener_paciente(paciente_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    paciente = db_module.obtener_paciente(db, paciente_id)
    if paciente is None:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return paciente

@app.get("/auth/config", response_model=ConfiguracionAcceso)
def configuracion_acceso():
    return {"public_demo": public_demo_enabled()}


@app.post("/auth/demo", response_model=Token)
def acceder_demo(db: Session = Depends(get_db)):
    if not public_demo_enabled():
        raise HTTPException(status_code=403, detail="La demo pública está desactivada")
    usuario = Usuario(
        nombre="Visitante",
        email=f"{uuid4().hex}@demo.anisa.test",
        rol="coordinador",
        password_hash=hash_password(token_urlsafe(32)),
    )
    db.add(usuario)
    db.commit()
    token = create_access_token(usuario.email, demo=True)
    return {"access_token": token, "token_type": "bearer"}


@app.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    usuario = db_module.obtener_usuario_por_email(db, form_data.username)
    if usuario is None or not verify_password(form_data.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
    token = create_access_token(usuario.email)
    return {"access_token": token, "token_type": "bearer"}

@app.patch("/citas/{cita_id}", response_model=Cita)
def actualizar_cita(cita_id: int, cambio: CitaActualizar, db: Session = Depends(get_db), usuario: Usuario = Depends(puede_actuar)):
    cita = db_module.actualizar_cita(db, cita_id, cambio.accion, cambio.nueva_fecha)
    if cita is None:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    return cita

@app.get("/auth/me", response_model=UsuarioOut)
def usuario_actual(usuario: Usuario = Depends(get_current_user)):
    return usuario