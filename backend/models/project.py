"""
Project model - Projetos/Fazendas/Propriedades.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.hybrid import hybrid_property

from backend.core.database import Base


class Project(Base):
    """Modelo de projeto (fazenda/propriedade)."""

    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="pending")  # pending, processing, completed, error

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

    @hybrid_property
    def area_hectares(self):
        """Alias para total_area_ha para compatibilidade."""
        return self.total_area_ha

    @hybrid_property
    def image_count(self):
        """Retorna contagem de imagens (calculado em consultas)."""
        return len(self.images) if self.images else 0

    def __repr__(self):
        return f"<Project(id={self.id}, name='{self.name}')>"
