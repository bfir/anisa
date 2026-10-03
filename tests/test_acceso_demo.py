import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from api import aprobaciones
from api.auth import create_access_token, hash_password
from api.database import Base, get_db
from api.main import app, demo_session_requests
from api.models_orm import Paciente, Usuario


@pytest.fixture
def db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        session.add_all([
            Usuario(id=1, nombre="Admin", email="admin@example.test", rol="admin",
                    password_hash=hash_password("test-password")),
            Paciente(id=1, nombre="Paciente demo", idioma="es", email="paciente@example.test",
                     pais="España", pasaporte="DEMO", telefono="000000000", aseguradora="Demo"),
        ])
        session.commit()
        yield session
    engine.dispose()


@pytest.fixture
def client(db, monkeypatch):
    monkeypatch.delenv("PUBLIC_DEMO_ENABLED", raising=False)
    monkeypatch.delenv("PUBLIC_DEMO_SESSION_LIMIT", raising=False)
    monkeypatch.delenv("PUBLIC_DEMO_MAX_USERS", raising=False)
    demo_session_requests.clear()
    anteriores = app.dependency_overrides.copy()
    app.dependency_overrides[get_db] = lambda: db
    try:
        with TestClient(app) as cliente:
            yield cliente
    finally:
        demo_session_requests.clear()
        app.dependency_overrides.clear()
        app.dependency_overrides.update(anteriores)


def cabeceras(response):
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def abrir_demo(client, numero=1):
    return client.post("/auth/demo", json={
        "visitor_id": f"00000000-0000-4000-8000-{numero:012d}",
    })


def test_modo_privado_por_defecto_no_crea_visitantes(client, db):
    assert client.get("/auth/config").json() == {"public_demo": False}
    assert abrir_demo(client).status_code == 403
    assert client.get("/pacientes/buscar?nombre=demo").status_code == 401
    assert db.query(Usuario).count() == 1


def test_demo_accede_sin_credenciales_y_no_concede_administracion(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_DEMO_ENABLED", "true")
    assert client.get("/auth/config").json() == {"public_demo": True}
    headers = cabeceras(client.post("/auth/demo", json={
        "visitor_id": "00000000-0000-4000-8000-000000000001",
        "rol": "admin",
        "email": "admin@example.test",
    }))
    usuario = client.get("/auth/me", headers=headers).json()
    assert usuario["rol"] == "coordinador"
    assert usuario["email"] != "admin@example.test"
    pacientes = client.get("/pacientes/buscar?nombre=demo", headers=headers)
    assert pacientes.status_code == 200
    assert pacientes.json()[0]["nombre"] == "Paciente demo"
    assert client.get("/auditoria", headers=headers).status_code == 403


def test_visitantes_no_comparten_propuestas(client, db, monkeypatch):
    monkeypatch.setenv("PUBLIC_DEMO_ENABLED", "true")
    primero = cabeceras(abrir_demo(client, 1))
    segundo = cabeceras(abrir_demo(client, 2))
    usuario = client.get("/auth/me", headers=primero).json()
    otro = client.get("/auth/me", headers=segundo).json()
    assert usuario["id"] != otro["id"]
    propuesta = aprobaciones.proponer(db, usuario["id"], "Prepara un mensaje", "es", "enviar_mensaje", {
        "paciente_id": 1, "tipo": "informativo", "idioma": "es", "texto": "Mensaje de prueba",
    })
    assert client.get("/agente/acciones", headers=primero).json()[0]["id"] == propuesta["id"]
    assert client.get("/agente/acciones", headers=segundo).json() == []
    assert client.post(f"/agente/acciones/{propuesta['id']}", headers=segundo,
                       json={"decision": "aprobar"}).status_code == 404


def test_desactivar_demo_revoca_visitantes_y_conserva_login(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_DEMO_ENABLED", "true")
    visitante = cabeceras(abrir_demo(client))
    monkeypatch.setenv("PUBLIC_DEMO_ENABLED", "false")
    assert client.get("/auth/me", headers=visitante).status_code == 401
    assert abrir_demo(client).status_code == 403
    normal = cabeceras(client.post("/auth/login", data={
        "username": "admin@example.test", "password": "test-password",
    }))
    assert client.get("/auth/me", headers=normal).json()["rol"] == "admin"


def test_token_demo_no_puede_promoverse_a_admin(client, db, monkeypatch):
    monkeypatch.setenv("PUBLIC_DEMO_ENABLED", "true")
    visitante = cabeceras(abrir_demo(client))
    identidad = client.get("/auth/me", headers=visitante).json()
    db.get(Usuario, identidad["id"]).rol = "admin"
    db.commit()
    assert client.get("/auditoria", headers=visitante).status_code == 401
    administrador = {"Authorization": f"Bearer {create_access_token('admin@example.test')}"}
    assert client.get("/auditoria", headers=administrador).status_code == 200


def test_mismo_visitante_reutiliza_identidad_sin_crear_usuarios(client, db, monkeypatch):
    monkeypatch.setenv("PUBLIC_DEMO_ENABLED", "true")
    primero = client.get("/auth/me", headers=cabeceras(abrir_demo(client, 3))).json()
    total = db.query(Usuario).count()
    segundo = client.get("/auth/me", headers=cabeceras(abrir_demo(client, 3))).json()
    assert segundo["id"] == primero["id"]
    assert db.query(Usuario).count() == total


def test_limita_la_creacion_de_sesiones_demo(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_DEMO_ENABLED", "true")
    monkeypatch.setenv("PUBLIC_DEMO_SESSION_LIMIT", "2")
    assert abrir_demo(client, 1).status_code == 200
    assert abrir_demo(client, 2).status_code == 200
    limitada = abrir_demo(client, 3)
    assert limitada.status_code == 429
    assert limitada.headers["retry-after"] == "60"


def test_acota_las_identidades_y_revoca_la_mas_antigua(client, db, monkeypatch):
    monkeypatch.setenv("PUBLIC_DEMO_ENABLED", "true")
    monkeypatch.setenv("PUBLIC_DEMO_MAX_USERS", "2")
    primera = cabeceras(abrir_demo(client, 1))
    cabeceras(abrir_demo(client, 2))
    cabeceras(abrir_demo(client, 3))
    assert db.query(Usuario).count() == 3
    assert client.get("/auth/me", headers=primera).status_code == 401
