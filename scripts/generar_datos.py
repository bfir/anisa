import sqlite3
import random
from datetime import datetime, timedelta
from faker import Faker

fake = Faker("es_ES")
Faker.seed(42)
random.seed(42)

RUTA_BD = "data/anisa.db"

IDIOMAS = ["es", "en", "ar", "fr"]
ESPECIALIDADES = ["Cardiología", "Traumatología", "Dermatología",
                  "Oftalmología", "Ginecología", "Neurología"]
ASEGURADORAS = ["Bupa Global", "Cigna", "Allianz Care", "AXA", "GeoBlue"]
CONCEPTOS = ["Primera consulta", "Consulta de seguimiento",
             "Prueba diagnóstica", "Intervención", "Análisis clínicos"]


def crear_tablas(cursor):
    cursor.execute("DROP TABLE IF EXISTS pacientes")
    cursor.execute("DROP TABLE IF EXISTS citas")
    cursor.execute("DROP TABLE IF EXISTS pagos")
    cursor.execute("""
        CREATE TABLE pacientes (
            id INTEGER PRIMARY KEY,
            nombre TEXT,
            pais TEXT,
            idioma TEXT,
            pasaporte TEXT,
            telefono TEXT,
            email TEXT,
            aseguradora TEXT
        )
    """)
    cursor.execute("""
        CREATE TABLE citas (
            id INTEGER PRIMARY KEY,
            paciente_id INTEGER,
            fecha TEXT,
            especialidad TEXT,
            medico TEXT,
            estado TEXT
        )
    """)
    cursor.execute("""
        CREATE TABLE pagos (
            id INTEGER PRIMARY KEY,
            paciente_id INTEGER,
            concepto TEXT,
            importe REAL,
            estado TEXT,
            fecha_emision TEXT
        )
    """)


def generar_paciente():
    return (
        fake.name(),
        fake.country(),
        random.choice(IDIOMAS),
        fake.bothify("??######").upper(),
        fake.phone_number(),
        fake.email(),
        random.choice(ASEGURADORAS),
    )


def generar_citas(paciente_id):
    citas = []
    for _ in range(random.randint(1, 4)):
        dias = random.randint(-30, 30)
        fecha = datetime.now() + timedelta(days=dias, hours=random.randint(0, 9))
        if dias < 0:
            estado = "completada"
        else:
            estado = "programada"
        if random.random() < 0.1:
            estado = "cancelada"
        citas.append((
            paciente_id,
            fecha.strftime("%Y-%m-%d %H:%M"),
            random.choice(ESPECIALIDADES),
            f"Dr. {fake.last_name()}",
            estado,
        ))
    return citas


def generar_pagos(paciente_id):
    pagos = []
    for _ in range(random.randint(0, 3)):
        pagos.append((
            paciente_id,
            random.choice(CONCEPTOS),
            round(random.uniform(60, 3000), 2),
            random.choice(["pendiente", "pagado"]),
            fake.date_this_year().strftime("%Y-%m-%d"),
        ))
    return pagos


def main():
    conexion = sqlite3.connect(RUTA_BD)
    cursor = conexion.cursor()

    crear_tablas(cursor)

    for _ in range(40):
        cursor.execute(
            """INSERT INTO pacientes
               (nombre, pais, idioma, pasaporte, telefono, email, aseguradora)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            generar_paciente(),
        )
        paciente_id = cursor.lastrowid

        for cita in generar_citas(paciente_id):
            cursor.execute(
                """INSERT INTO citas
                   (paciente_id, fecha, especialidad, medico, estado)
                   VALUES (?, ?, ?, ?, ?)""",
                cita,
            )
        for pago in generar_pagos(paciente_id):
            cursor.execute(
                """INSERT INTO pagos
                   (paciente_id, concepto, importe, estado, fecha_emision)
                   VALUES (?, ?, ?, ?, ?)""",
                pago,
            )

    conexion.commit()

    for tabla in ["pacientes", "citas", "pagos"]:
        total = cursor.execute(f"SELECT COUNT(*) FROM {tabla}").fetchone()[0]
        print(f"{tabla}: {total} filas")

    conexion.close()


if __name__ == "__main__":
    main()