"""
Project model - Projetos/Fazendas/Propriedades.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from backend.core.database import Base


class Project(Base):
    """Modelo de projeto (fazenda/propriedade)."""

    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Localização
    location = Column(String(255), nullable=True)  # Endereço ou nome do local
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    total_area_ha = Column(Float, nullable=True)  # Área total em hectares

    # Owner
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relacionamentos
    owner = relationship("User", back_populates="projects")
    images = relationship("Image", back_populates="project", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Project(id={self.id}, name='{self.name}')>"
