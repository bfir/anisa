"""baseline: estado actual del esquema

Esta es la primera migración tras introducir Alembic en un proyecto que ya tenía
tablas creadas a mano (Base.metadata.create_all + un ALTER TABLE suelto para
estado_envio). El autogenerate detectó una pequeña deriva histórica entre los
modelos y la base real: a Citas/Mensajes/Pagos les faltaba la restricción de
clave foránea hacia Pacientes que el modelo ya declaraba (create_all no añade
restricciones a tablas que ya existen), y estado_envio se creó como TEXT en vez
de VARCHAR sin límite. Se comprobó que no hay filas huérfanas antes de aplicarla:
es una corrección aditiva y seguro ejecutarla contra los datos reales.

Revision ID: 7365b2b5446b
Revises:
Create Date: 2026-09-25 20:49:01.337121

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7365b2b5446b'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_foreign_key('fk_citas_paciente_id', 'citas', 'pacientes', ['paciente_id'], ['id'])
    op.alter_column('mensajes', 'estado_envio',
               existing_type=sa.TEXT(),
               type_=sa.String(),
               existing_nullable=True)
    op.create_foreign_key('fk_mensajes_paciente_id', 'mensajes', 'pacientes', ['paciente_id'], ['id'])
    op.create_foreign_key('fk_pagos_paciente_id', 'pagos', 'pacientes', ['paciente_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_pagos_paciente_id', 'pagos', type_='foreignkey')
    op.drop_constraint('fk_mensajes_paciente_id', 'mensajes', type_='foreignkey')
    op.alter_column('mensajes', 'estado_envio',
               existing_type=sa.String(),
               type_=sa.TEXT(),
               existing_nullable=True)
    op.drop_constraint('fk_citas_paciente_id', 'citas', type_='foreignkey')
