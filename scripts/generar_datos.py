import random
from datetime import datetime, timedelta

from faker import Faker

from dotenv import load_dotenv
load_dotenv()

from api.database import SessionLocal
from api.models_orm import Cita, Mensaje, Pago, Paciente, Usuario

fake = Faker("es_ES")
Faker.seed(42)
random.seed(42)

IDIOMAS = ["es", "en", "ar", "fr"]
ESPECIALIDADES = ["Cardiología", "Traumatología", "Dermatología",
                  "Oftalmología", "Ginecología", "Neurología"]
ASEGURADORAS = ["Bupa Global", "Cigna", "Allianz Care", "AXA", "GeoBlue"]
CONCEPTOS = ["Primera consulta", "Consulta de seguimiento",
             "Prueba diagnóstica", "Intervención", "Análisis clínicos"]


def limpiar_tablas(db):
    """Borra todo lo que hubiera antes, para partir de cero en cada ejecución."""
    db.query(Mensaje).delete()
    db.query(Cita).delete()
    db.query(Pago).delete()
    db.query(Paciente).delete()
    db.query(Usuario).delete()

    db.commit()


def crear_pacientes_demo(db):
    demo = [
        ("Fátima Al Mansouri", "Emiratos Árabes Unidos", "ar", "1990-04-12", "Daman Health Insurance"),
        ("Laura García", "España", "es", "1985-11-02", "Sanitas"),
        ("James Cole", "Reino Unido", "en", "1978-06-30", "Bupa Global"),
        ("Camille Dubois", "Francia", "fr", "1992-09-15", "AXA"),
    ]
    for nombre, pais, idioma, fecha_nacimiento, aseguradora in demo:
        paciente = Paciente(
            nombre=nombre,
            pais=pais,
            idioma=idioma,
            pasaporte="DEMO0000",
            telefono="+34600000000",
            email=f"{nombre.split()[0].lower()}@demo.test",
            aseguradora=aseguradora,
            fecha_nacimiento=fecha_nacimiento,
        )
        db.add(paciente)
    db.commit()


def crear_citas(db, paciente_id):
    for _ in range(random.randint(1, 4)):
        dias = random.randint(-30, 30)
        fecha = datetime.now() + timedelta(days=dias, hours=random.randint(0, 9))
        if dias < 0:
            estado = "completada"
        else:
            estado = "programada"
        if random.random() < 0.1:
            estado = "cancelada"
        db.add(Cita(
            paciente_id=paciente_id,
            fecha=fecha.strftime("%Y-%m-%d %H:%M"),
            especialidad=random.choice(ESPECIALIDADES),
            medico=f"Dr. {fake.last_name()}",
            estado=estado,
        ))


def crear_pagos(db, paciente_id):
    for _ in range(random.randint(0, 3)):
        db.add(Pago(
            paciente_id=paciente_id,
            concepto=random.choice(CONCEPTOS),
            importe=round(random.uniform(60, 3000), 2),
            estado=random.choice(["pendiente", "pagado"]),
            fecha_emision=fake.date_this_year().strftime("%Y-%m-%d"),
        ))


def crear_usuarios_demo(db):
    from api.auth import hash_password
    usuarios = [
        ("Admin", "admin@anisa.dev", "admin123", "admin"),
        ("Coordinador", "coordinador@anisa.dev", "coord123", "coordinador"),
    ]
    for nombre, email, password, rol in usuarios:
        db.add(Usuario(
            nombre=nombre,
            email=email,
            password_hash=hash_password(password),
            rol=rol,
        ))
    db.commit()


def main():
    db = SessionLocal()

    limpiar_tablas(db)
    crear_pacientes_demo(db)
    crear_usuarios_demo(db)

    for _ in range(40):
        paciente = Paciente(
            nombre=fake.name(),
            pais=fake.country(),
            idioma=random.choice(IDIOMAS),
            pasaporte=fake.bothify("??######").upper(),
            telefono=fake.phone_number(),
            email=fake.safe_email(),
            aseguradora=random.choice(ASEGURADORAS),
            fecha_nacimiento=fake.date_of_birth(minimum_age=18, maximum_age=85).strftime("%Y-%m-%d"),
        )
        db.add(paciente)
        db.commit()  # necesario ya, para que paciente.id exista antes de usarlo abajo

        crear_citas(db, paciente.id)
        crear_pagos(db, paciente.id)

    db.commit()

    for modelo, nombre in [(Paciente, "pacientes"), (Cita, "citas"), (Pago, "pagos"), (Mensaje, "mensajes"), (Usuario, "usuarios")]:
        total = db.query(modelo).count()
        print(f"{nombre}: {total} filas")

    db.close()


if __name__ == "__main__":
    main()
