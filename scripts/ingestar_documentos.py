"""Lee data/documentos/*.md, los parte en secciones (por encabezado '##') y guarda cada
sección como una fila en documento_chunks con su embedding, para búsqueda semántica (RAG).
Volver a ejecutarlo tras editar un documento es seguro: borra y recrea sus fragmentos."""
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from api.database import SessionLocal
from api.models_orm import DocumentoChunk
from api.rag import generar_embedding

CARPETA_DOCUMENTOS = Path(__file__).resolve().parent.parent / "data" / "documentos"


def dividir_en_secciones(texto):
    """De un markdown con '# Título' y varios '## Sección' devuelve (titulo, [(seccion, cuerpo)])."""
    titulo = None
    secciones = []
    seccion_actual = None
    cuerpo_actual = []

    for linea in texto.splitlines():
        if linea.startswith("# ") and titulo is None:
            titulo = linea[2:].split("—")[0].strip()
        elif linea.startswith("## "):
            if seccion_actual is not None:
                secciones.append((seccion_actual, "\n".join(cuerpo_actual).strip()))
            seccion_actual = linea[3:].strip()
            cuerpo_actual = []
        elif seccion_actual is not None:
            cuerpo_actual.append(linea)

    if seccion_actual is not None:
        secciones.append((seccion_actual, "\n".join(cuerpo_actual).strip()))

    return titulo, secciones


def ingestar_archivo(db, ruta):
    titulo, secciones = dividir_en_secciones(ruta.read_text(encoding="utf-8"))

    db.query(DocumentoChunk).filter(DocumentoChunk.documento == ruta.name).delete()

    for seccion, cuerpo in secciones:
        if not cuerpo:
            continue
        embedding = generar_embedding(f"{titulo} — {seccion}\n{cuerpo}", tipo="search_document")
        db.add(DocumentoChunk(
            documento=ruta.name,
            titulo=titulo,
            seccion=seccion,
            texto=cuerpo,
            embedding=embedding,
        ))

    db.commit()


def main():
    db = SessionLocal()
    archivos = sorted(CARPETA_DOCUMENTOS.glob("*.md"))
    if not archivos:
        print(f"No hay archivos .md en {CARPETA_DOCUMENTOS}")
        return

    for ruta in archivos:
        ingestar_archivo(db, ruta)
        print(f"{ruta.name}: ingestado")

    print(f"Total de fragmentos en la base: {db.query(DocumentoChunk).count()}")
    db.close()


if __name__ == "__main__":
    main()
