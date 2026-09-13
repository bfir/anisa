import os

from dotenv import load_dotenv
from smolagents import CodeAgent, OpenAIServerModel, tool

from api import db

load_dotenv()

@tool
def buscar_pacientes(nombre: str) -> list:
    """Busca pacientes cuyo nombre contenga el texto dado.
    Args:
        nombre: Texto a buscar en el nombre del paciente.
    """
    return db.buscar_pacientes(nombre)

@tool
def citas_proximas(dias: int) -> list:
    """Devuelve las citas programadas en los próximos N días.
    Args:
        dias: Número de días hacia delante.
    """    
    return db.citas_proximas(dias)

@tool 
def pagos_pendientes()-> list:
    """Devuelve todos los pagos que estén pendientes de cobro."""
    return db.pagos_pendientes()

@tool
def enviar_mensaje(paciente_id: int, tipo: str, idioma: str, texto: str) -> dict:
    """Redacta y envía un mensaje a un paciente en su idioma.
    Args:
        paciente_id: El id del paciente.
        tipo: Tipo de mensaje: recordatorio_cita, pago_pendiente o informativo.
        idioma: Idioma del mensaje: es, en, ar o fr.
        texto: El texto del mensaje, ya redactado en ese idioma.
    """
    return db.registrar_mensaje(paciente_id, tipo, idioma, texto) 

modelo= OpenAIServerModel(
    model_id="openai/gpt-oss-120b",
    api_base="https://api.groq.com/openai/v1",
    api_key=os.environ["GROQ_API_KEY"],
)   

agente = CodeAgent(
    tools=[buscar_pacientes, citas_proximas, pagos_pendientes, enviar_mensaje],
    model=modelo,
)

if __name__=="__main__":
    print("Anisa (smolagents) - escribe tu pregunta (o 'salir)\n")
    while True:
        pregunta = input("Tú: ")
        if pregunta.strip().lower()== "salir":
            break
        resultado = agente.run(pregunta)
        print(f"\nAnisa: {resultado}\n")