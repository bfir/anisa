"""secure public demo identities

Revision ID: 433fffb722f4
Revises: 915b117f6696
Create Date: 2026-10-03 21:50:22.008362

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '433fffb722f4'
down_revision: Union[str, Sequence[str], None] = '915b117f6696'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(
        "DELETE FROM auditoria WHERE usuario_id IN "
        "(SELECT id FROM usuarios WHERE email LIKE '%@demo.anisa.test')"
    )
    op.execute("DELETE FROM usuarios WHERE email LIKE '%@demo.anisa.test'")
    op.add_column(
        "usuarios",
        sa.Column("demo_visitor_id", sa.String(), nullable=True),
    )
    op.add_column(
        "usuarios",
        sa.Column("demo_secret_hash", sa.String(), nullable=True),
    )
    op.create_index(
        "uq_usuarios_demo_visitor_id",
        "usuarios",
        ["demo_visitor_id"],
        unique=True,
        postgresql_where=sa.text("demo_visitor_id IS NOT NULL"),
        sqlite_where=sa.text("demo_visitor_id IS NOT NULL"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("uq_usuarios_demo_visitor_id", table_name="usuarios")
    op.drop_column("usuarios", "demo_secret_hash")
    op.drop_column("usuarios", "demo_visitor_id")
