"""Cambia la contraseña del usuario admin sin tocar el resto de datos.

Uso:
    python -m scripts.cambiar_password_admin

Lee la nueva contraseña de la variable ADMIN_PASSWORD (en .env).
"""
import os
import sys

from dotenv import load_dotenv
load_dotenv()

from api.auth import hash_password
from api.database import SessionLocal
from api.models_orm import Usuario

ADMIN_EMAIL = "admin@anisa.dev"


def main():
    nueva = os.getenv("ADMIN_PASSWORD")
    if not nueva:
        sys.exit("Falta ADMIN_PASSWORD en el archivo .env. Añádela y vuelve a ejecutar.")
    if len(nueva) < 10:
        sys.exit("La contraseña debe tener al menos 10 caracteres.")

    db = SessionLocal()
    try:
        admin = db.query(Usuario).filter(Usuario.email == ADMIN_EMAIL).first()
        if admin is None:
            sys.exit(f"No existe ningún usuario {ADMIN_EMAIL} en la base de datos.")
        admin.password_hash = hash_password(nueva)
        db.commit()
        print(f"Contraseña de {ADMIN_EMAIL} actualizada correctamente.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
