from rank_bm25 import BM25Okapi

from api import rag
from api.models_orm import DocumentoChunk


def _tokenizar(texto):
    return texto.lower().split()


def construir_indice_bm25(db):
    """Construye el índice BM25 una sola vez, a partir de todos los fragmentos."""
    chunks = db.query(DocumentoChunk).all()
    corpus = [_tokenizar(c.texto) for c in chunks]
    return BM25Okapi(corpus), chunks


def obtener_rankings(db, pregunta, bm25, chunks, k_rrf=60):
    """Una sola llamada a embeddings por pregunta: devuelve el ranking completo
    vectorial y el híbrido (RRF), para comparar a varios valores de k sin repetir nada."""
    vector = rag.generar_embedding(pregunta, tipo="search_query")

    ranking_vectorial = (
        db.query(DocumentoChunk)
        .order_by(DocumentoChunk.embedding.cosine_distance(vector))
        .all()
    )
    posicion_vectorial = {c.id: i for i, c in enumerate(ranking_vectorial)}

    puntuaciones_bm25 = bm25.get_scores(_tokenizar(pregunta))
    orden_bm25 = sorted(range(len(chunks)), key=lambda i: puntuaciones_bm25[i], reverse=True)
    posicion_bm25 = {chunks[i].id: rank for rank, i in enumerate(orden_bm25)}

    ranking_hibrido = sorted(
        chunks,
        key=lambda c: 1 / (k_rrf + posicion_vectorial[c.id]) + 1 / (k_rrf + posicion_bm25[c.id]),
        reverse=True,
    )

    return ranking_vectorial, ranking_hibrido
