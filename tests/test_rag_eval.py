"""Evalúa el sistema RAG contra las 20 preguntas de data/evaluacion/preguntas.json:
recall@5 de la recuperación, fidelidad (no se inventa nada fuera del contexto) y
corrección (comparada con la respuesta de referencia), usando un LLM como juez."""
import json
import os
from pathlib import Path

import pytest
from dotenv import load_dotenv
load_dotenv()

from groq import Groq

from api.database import SessionLocal
from api import rag
from api.agente import preguntar

RUTA_PREGUNTAS = Path(__file__).resolve().parent.parent / "data" / "evaluacion" / "preguntas.json"
cliente_juez = Groq(api_key=os.environ["GROQ_API_KEY"])


def cargar_preguntas():
    with open(RUTA_PREGUNTAS, encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture(scope="module")
def db():
    sesion = SessionLocal()
    yield sesion
    sesion.close()


def preguntar_al_juez(instrucciones):
    """Le pide a un LLM que actúe de juez. Debe responder solo 'si' o 'no' (sin tilde)."""
    respuesta = cliente_juez.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[{"role": "user", "content": instrucciones + "\n\nResponde solo con la palabra si o no, sin tilde y sin nada más."}],
        temperature=0,
    )
    return respuesta.choices[0].message.content.strip().lower().startswith("si")


def test_recall_at_5(db):
    preguntas = [p for p in cargar_preguntas() if p["documento_esperado"] is not None]
    aciertos = 0
    for p in preguntas:
        resultados = rag.buscar_contexto(db, p["pregunta"], k=5)
        archivos = [r["archivo"] for r in resultados]
        if p["documento_esperado"] in archivos:
            aciertos += 1
    recall = aciertos / len(preguntas)
    print(f"\nrecall@5 = {recall:.0%} ({aciertos}/{len(preguntas)})")
    assert recall >= 0.8


def test_fidelidad(db):
    preguntas = cargar_preguntas()
    fieles = 0
    for p in preguntas:
        respuesta, pasos = preguntar(p["pregunta"], db)
        contexto = "\n".join(str(paso["resultado"]) for paso in pasos if paso["resultado"])
        veredicto = preguntar_al_juez(
            f"Contexto disponible:\n{contexto}\n\nRespuesta a evaluar:\n{respuesta}\n\n"
            "¿Toda afirmación de la respuesta está respaldada por el contexto, "
            "o se inventa algo que no aparece ahí?"
        )
        if veredicto:
            fieles += 1
    print(f"\nfidelidad = {fieles}/{len(preguntas)}")
    assert fieles / len(preguntas) >= 0.8


def test_correccion(db):
    preguntas = cargar_preguntas()
    correctas = 0
    for p in preguntas:
        respuesta, _ = preguntar(p["pregunta"], db)
        veredicto = preguntar_al_juez(
            f"Respuesta de referencia (correcta):\n{p['respuesta_referencia']}\n\n"
            f"Respuesta a evaluar:\n{respuesta}\n\n"
            "¿Dice la respuesta a evaluar, en sustancia, lo mismo que la respuesta de referencia? "
            "No hace falta que use las mismas palabras."
        )
        if veredicto:
            correctas += 1
    print(f"\ncorrección = {correctas}/{len(preguntas)}")
    assert correctas / len(preguntas) >= 0.7
