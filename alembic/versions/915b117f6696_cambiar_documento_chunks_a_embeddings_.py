"""cambiar documento_chunks a embeddings de Cohere (1024 dim)

Revision ID: 915b117f6696
Revises: b6e79b28a1ac
Create Date: 2026-10-02 11:09:01.254139

"""
"""Cambia el modelo de embeddings de MiniLM local (384 dim) a Cohere embed-multilingual-v3.0
(1024 dim). Los vectores de un modelo no sirven para el otro (espacios distintos, ver la
explicación de embeddings), así que vaciamos la tabla antes de cambiar el tipo de columna —
los datos se regeneran ejecutando de nuevo scripts/ingestar_documentos.py."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import pgvector.sqlalchemy


# revision identifiers, used by Alembic.
revision: str = '915b117f6696'
down_revision: Union[str, Sequence[str], None] = 'b6e79b28a1ac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute('TRUNCATE TABLE documento_chunks')
    op.alter_column('documento_chunks', 'embedding',
               existing_type=pgvector.sqlalchemy.vector.VECTOR(dim=384),
               type_=pgvector.sqlalchemy.vector.VECTOR(dim=1024),
               existing_nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute('TRUNCATE TABLE documento_chunks')
    op.alter_column('documento_chunks', 'embedding',
               existing_type=pgvector.sqlalchemy.vector.VECTOR(dim=1024),
               type_=pgvector.sqlalchemy.vector.VECTOR(dim=384),
               existing_nullable=True)
