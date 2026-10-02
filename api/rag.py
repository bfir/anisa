import os 
from functools import lru_cache

import cohere 

from api.models_orm import DocumentoChunk

NOMBRE_MODELO = "embed-multilingual-v3.0"

@lru_cache(maxsize=1)
def _cliente():
    return cohere.ClientV2(api_key=os.environ["COHERE_API_KEY"])

def generar_embedding(texto, tipo):
    respuesta = _cliente().embed(
        texts=[texto],
        model=NOMBRE_MODELO,
        input_type=tipo,
        embedding_types=["float"],
    )
    return respuesta.embeddings.float_[0]

def buscar_contexto(db, pregunta, k=4):
    vector= generar_embedding(pregunta, tipo="search_query")
    chunks = (
        db.query(DocumentoChunk)
        .order_by(DocumentoChunk.embedding.cosine_distance(vector))
        .limit(k)
        .all()
    )
    return [
        {"documento": c.titulo, "archivo": c.documento, "seccion": c.seccion, "texto": c.texto}
        for c in chunks
    ]