"""Capa de acceso a datos: todas las consultas a anisa.db viven aquí.

La API (main.py) y, más adelante, el agente, llaman a estas funciones
en lugar de escribir SQL por su cuenta.
"""

import sqlite3

RUTA_BD = "data/anisa.db"


def _conectar():
    """Abre una conexión con filas accesibles por nombre de columna."""
    conexion = sqlite3.connect(RUTA_BD)
    conexion.row_factory = sqlite3.Row
    return conexion


def buscar_pacientes(nombre):
    """Pacientes cuyo nombre contiene el texto dado (búsqueda parcial)."""
    conexion = _conectar()
    filas = conexion.execute(
        "SELECT * FROM pacientes WHERE nombre LIKE ? ORDER BY nombre",
        (f"%{nombre}%",),
    ).fetchall()
    conexion.close()
    return [dict(fila) for fila in filas]


def obtener_paciente(paciente_id):
    """Un paciente por su id, o None si no existe."""
    conexion = _conectar()
    fila = conexion.execute(
        "SELECT * FROM pacientes WHERE id = ?",
        (paciente_id,),
    ).fetchone()
    conexion.close()
    return dict(fila) if fila else None


def citas_de_paciente(paciente_id):
    """Todas las citas de un paciente, ordenadas por fecha."""
    conexion = _conectar()
    filas = conexion.execute(
        "SELECT * FROM citas WHERE paciente_id = ? ORDER BY fecha",
        (paciente_id,),
    ).fetchall()
    conexion.close()
    return [dict(fila) for fila in filas]


def citas_proximas(dias):
    """Citas programadas entre hoy y dentro de `dias` días."""
    conexion = _conectar()
    filas = conexion.execute(
        """SELECT citas.*, pacientes.nombre AS paciente_nombre
           FROM citas
           JOIN pacientes ON pacientes.id = citas.paciente_id
           WHERE citas.estado = 'programada'
             AND citas.fecha >= datetime('now')
             AND citas.fecha <= datetime('now', ?)
           ORDER BY citas.fecha""",
        (f"+{dias} days",),
    ).fetchall()
    conexion.close()
    return [dict(fila) for fila in filas]


def pagos_pendientes():
    """Pagos sin abonar, del importe más alto al más bajo, con el nombre del paciente."""
    conexion = _conectar()
    filas = conexion.execute(
        """SELECT pagos.*, pacientes.nombre AS paciente_nombre
           FROM pagos
           JOIN pacientes ON pacientes.id = pagos.paciente_id
           WHERE pagos.estado = 'pendiente'
           ORDER BY pagos.importe DESC"""
    ).fetchall()
    conexion.close()
    return [dict(fila) for fila in filas]

def registrar_mensaje(paciente_id, tipo, idioma, texto):
    conexion = _conectar()
    cursor= conexion.execute(
        """INSERT INTO mensajes (paciente_id, tipo, idioma, texto, enviado_en)
            VALUES(?, ?, ?, ?, datetime('now'))""",
        (paciente_id, tipo, idioma, texto),
    )
    conexion.commit()
    nuevo_id=cursor.lastrowid
    fila=conexion.execute(
        "SELECT * FROM mensajes WHERE id = ?", (nuevo_id,)
    ).fetchone()
    conexion.close()
    return dict(fila)

def mensajes_de_paciente(paciente_id):
    conexion = _conectar()
    filas = conexion.execute(
        "SELECT * FROM mensajes WHERE paciente_id =? ORDER BY enviado_en DESC",
        (paciente_id,),
    ).fetchall()
    conexion.close()
    return [dict(fila) for fila in filas]

def verificar_identidad(nombre, fecha_nacimiento):
    conexion = _conectar()
    fila = conexion.execute(
        "Select id FROM pacientes WHERE nombre = ? AND fecha_nacimiento =?",
        (nombre, str(fecha_nacimiento)),
    ).fetchone()
    conexion.close()
    return fila is not None