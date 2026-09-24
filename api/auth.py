import os
from datetime import datetime, timedelta

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from api.database import get_db
from api.models_orm import Usuario

SECRET_KEY = os.environ["SECRET_KEY"]
ALGORITMO = "HS256"
MINUTOS_EXPIRACION = 60 * 24  # 24 horas

pwd_context = CryptContext(schemes=["argon2"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def hash_password(password):
    return pwd_context.hash(password)


def verify_password(password, password_hash):
    return pwd_context.verify(password, password_hash)


def create_access_token(email):
    expira = datetime.utcnow() + timedelta(minutes=MINUTOS_EXPIRACION)
    datos = {"sub": email, "exp": expira}
    return jwt.encode(datos, SECRET_KEY, algorithm=ALGORITMO)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credenciales_invalidas = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar la sesión",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITMO])
        email = payload.get("sub")
        if email is None:
            raise credenciales_invalidas
    except jwt.PyJWTError:
        raise credenciales_invalidas

    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    if usuario is None:
        raise credenciales_invalidas
    return usuario


def require_rol(rol_requerido):
    def verificador(usuario: Usuario = Depends(get_current_user)):
        if usuario.rol != rol_requerido:
            raise HTTPException(status_code=403, detail="No tienes permiso para esto")
        return usuario
    return verificador
