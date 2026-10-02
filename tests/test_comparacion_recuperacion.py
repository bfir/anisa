"""Compara recuperacion solo vectorial vs. hibrida (vectorial + BM25) para decidir
con datos, no a ojo, cual configuracion usar. Calcula el embedding de cada pregunta
una sola vez y reutiliza el ranking completo para los 3 valores de k."""
import json
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from api.database import SessionLocal
from api.busqueda_hibrida import construir_indice_bm25, obtener_rankings

RUTA_PREGUNTAS = Path(__file__).resolve().parent.parent / "data" / "evaluacion" / "preguntas.json"


def cargar_preguntas_con_respuesta():
    with open(RUTA_PREGUNTAS, encoding="utf-8") as f:
        preguntas = json.load(f)
    return [p for p in preguntas if p["documento_esperado"] is not None]


def test_comparar_vectorial_vs_hibrido():
    db = SessionLocal()
    preguntas = cargar_preguntas_con_respuesta()
    bm25, chunks = construir_indice_bm25(db)

    aciertos_vectorial = {1: 0, 3: 0, 5: 0}
    aciertos_hibrido = {1: 0, 3: 0, 5: 0}

    for p in preguntas:
        ranking_vectorial, ranking_hibrido = obtener_rankings(db, p["pregunta"], bm25, chunks)
        for k in (1, 3, 5):
            if p["documento_esperado"] in [c.documento for c in ranking_vectorial[:k]]:
                aciertos_vectorial[k] += 1
            if p["documento_esperado"] in [c.documento for c in ranking_hibrido[:k]]:
                aciertos_hibrido[k] += 1

    print()
    for k in (1, 3, 5):
        recall_vectorial = aciertos_vectorial[k] / len(preguntas)
        recall_hibrido = aciertos_hibrido[k] / len(preguntas)
        print(f"recall@{k}: vectorial={recall_vectorial:.0%}  hibrido={recall_hibrido:.0%}")

    db.close()
