"""
ApiKey model - Chaves de API para acesso externo.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship

from backend.core.database import Base


class ApiKey(Base):
    """Modelo de chave de API para clientes externos."""

    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    key_hash = Column(String(255), unique=True, nullable=False, index=True)
    prefix = Column(String(20), nullable=False)  # rbr_live_ ou rbr_test_
    name = Column(String(255), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    scopes = Column(JSON, default=list)  # ["aerial:read", "aerial:write", ...]
    rate_limit_per_hour = Column(Integer, default=100)
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relacionamentos
    user = relationship("User", backref="api_keys")

    def __repr__(self):
        return f"<ApiKey(id={self.id}, prefix='{self.prefix}', name='{self.name}')>"
