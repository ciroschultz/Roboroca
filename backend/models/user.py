"""
User model - Usuários do sistema.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.orm import relationship

from backend.core.database import Base


class User(Base):
    """Modelo de usuário."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    bio = Column(Text, nullable=True)
    company = Column(String(255), nullable=True)

    # Preferências
    language = Column(String(10), nullable=True, default="pt-BR")
    theme = Column(String(20), nullable=True, default="dark")
    email_notifications = Column(Boolean, nullable=True, default=True)
    push_notifications = Column(Boolean, nullable=True, default=True)
    weekly_report = Column(Boolean, nullable=True, default=False)

    # Password reset
    reset_token = Column(String(255), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)

    # Status
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)

    # Plano/Assinatura
    plan = Column(String(50), default="free")  # free, basic, pro, enterprise

    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relacionamentos
    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}')>"
