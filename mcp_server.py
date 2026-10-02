"""Servidor MCP de Anisa: expone, de forma de solo lectura y estandarizada, la
documentación de aseguradoras y el historial de auditoría del asistente a cualquier
cliente MCP (Claude Desktop, MCP Inspector, u otro). No expone nada que modifique datos
(enviar mensajes, cambiar citas): es un servidor de consulta, no de acción.

Arrancar en modo desarrollo (con el Inspector web): mcp dev mcp_server.py
Arrancar tal cual lo usaría un cliente real (stdio):   python mcp_server.py
"""
from dotenv import load_dotenv
load_dotenv()

from mcp.server.mcpserver import MCPServer

from api.database import SessionLocal
from api import db as db_module
from api import rag

mcp = MCPServer("Anisa")


@mcp.tool()
def buscar_docs(pregunta: str) -> list[dict]:
    """Busca en la documentación de referencia de aseguradoras (cobertura, documentación
    requerida, preautorización, copagos) y devuelve los fragmentos más relevantes, cada
    uno con su documento y sección de origen."""
    db = SessionLocal()
    try:
        return rag.buscar_contexto(db, pregunta)
    finally:
        db.close()


@mcp.tool()
def consultar_auditoria(filtro: str) -> list[dict]:
    """Busca en el historial de preguntas hechas al asistente de Anisa, filtrando por
    texto que aparezca en la pregunta o en la respuesta (p. ej. 'Daman' o 'preautorización')."""
    db = SessionLocal()
    try:
        return db_module.buscar_auditoria(db, filtro)
    finally:
        db.close()


if __name__ == "__main__":
    mcp.run()
