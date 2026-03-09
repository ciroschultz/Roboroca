"""
Calculator models - Cálculos agrícolas persistidos.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship

from backend.core.database import Base


class Calculation(Base):
    """Modelo de cálculo salvo."""

    __tablename__ = "calculations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    calc_type = Column(String(50), nullable=False, index=True)  # conversao, custo_producao, produtividade, pecuaria, insumos, irrigacao, financiamento
    title = Column(String(255), nullable=False)
    inputs = Column(JSON, nullable=False)
    result = Column(JSON, nullable=False)
    result_summary = Column(Text, nullable=False)  # Human-readable summary, e.g. "36.30 ha"

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<Calculation(id={self.id}, type='{self.calc_type}', user_id={self.user_id})>"
