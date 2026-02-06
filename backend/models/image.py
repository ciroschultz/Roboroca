"""
Image model - Imagens de drone/satélite.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from backend.core.database import Base


class Image(Base):
    """Modelo de imagem (drone ou satélite)."""

    __tablename__ = "images"

    id = Column(Integer, primary_key=True, index=True)

    # Informações do arquivo
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)  # Caminho no storage
    file_size = Column(Integer, nullable=True)  # Tamanho em bytes
    mime_type = Column(String(100), nullable=True)

    # Tipo de imagem
    image_type = Column(String(50), default="drone")  # drone, satellite, aerial
    source = Column(String(100), nullable=True)  # Sentinel-2, DJI, etc.

    # Metadados geoespaciais
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    crs = Column(String(50), nullable=True)  # Sistema de coordenadas (EPSG:4326)
    bounds = Column(JSON, nullable=True)  # {"minx": ..., "miny": ..., "maxx": ..., "maxy": ...}
    center_lat = Column(Float, nullable=True)
    center_lon = Column(Float, nullable=True)
    resolution = Column(Float, nullable=True)  # Metros por pixel

    # Bandas disponíveis
    bands = Column(JSON, nullable=True)  # ["R", "G", "B", "NIR", ...]

    # Data da captura
    capture_date = Column(DateTime, nullable=True)

    # Status de processamento
    status = Column(String(50), default="uploaded")  # uploaded, processing, ready, error

    # Relacionamentos
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    project = relationship("Project", back_populates="images")
    analyses = relationship("Analysis", back_populates="image", cascade="all, delete-orphan")
    annotations = relationship("Annotation", back_populates="image", cascade="all, delete-orphan")

    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<Image(id={self.id}, filename='{self.filename}')>"
