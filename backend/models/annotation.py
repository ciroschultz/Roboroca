"""
Annotation model - Anotacoes de mapa para imagens.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from backend.core.database import Base


class Annotation(Base):
    """Modelo de anotacao de mapa."""

    __tablename__ = "annotations"

    id = Column(Integer, primary_key=True, index=True)

    # Tipo de anotacao
    annotation_type = Column(String(50), nullable=False)
    # Tipos: point, polygon, measurement, circle, rectangle

    # Dados da anotacao (coordenadas, estilo, label, etc)
    data = Column(JSON, nullable=False)
    """
    Estrutura de data por tipo:

    point: {
        "x": 100,
        "y": 200,
        "label": "Ponto de interesse",
        "color": "#FF0000",
        "icon": "marker"
    }

    polygon: {
        "points": [[x1, y1], [x2, y2], [x3, y3], ...],
        "label": "Area demarcada",
        "color": "#00FF00",
        "fill_opacity": 0.3
    }

    measurement: {
        "start": {"x": 100, "y": 100},
        "end": {"x": 200, "y": 200},
        "distance_pixels": 141.42,
        "distance_meters": 50.5,
        "color": "#0000FF"
    }

    circle: {
        "center": {"x": 150, "y": 150},
        "radius": 50,
        "label": "Area circular",
        "color": "#FFFF00",
        "fill_opacity": 0.2
    }

    rectangle: {
        "x": 100,
        "y": 100,
        "width": 200,
        "height": 150,
        "label": "Area retangular",
        "color": "#FF00FF",
        "fill_opacity": 0.2
    }
    """

    # Relacionamentos
    image_id = Column(Integer, ForeignKey("images.id"), nullable=False)
    image = relationship("Image", back_populates="annotations")

    # Usuario que criou a anotacao
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<Annotation(id={self.id}, type='{self.annotation_type}', image_id={self.image_id})>"
