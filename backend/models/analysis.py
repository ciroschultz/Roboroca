"""
Analysis model - Resultados de análises (NDVI, classificação, contagem de plantas, etc).
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from backend.core.database import Base


class Analysis(Base):
    """Modelo de análise de imagem."""

    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)

    # Tipo de análise
    analysis_type = Column(String(50), nullable=False)
    # Tipos: ndvi, classification, area, plant_count, plant_health, height_estimation, soil_analysis, full_report

    # Status
    status = Column(String(50), default="pending")  # pending, processing, completed, error
    error_message = Column(Text, nullable=True)

    # Resultados
    results = Column(JSON, nullable=True)
    """
    Estrutura de results por tipo:

    ndvi: {
        "min": -0.5,
        "max": 0.9,
        "mean": 0.45,
        "std": 0.15,
        "output_path": "path/to/ndvi_result.tif",
        "thumbnail_path": "path/to/ndvi_thumb.png"
    }

    classification: {
        "classes": {
            "forest": {"area_ha": 150.5, "percentage": 30.1},
            "pasture": {"area_ha": 200.0, "percentage": 40.0},
            "agriculture": {"area_ha": 100.0, "percentage": 20.0},
            "water": {"area_ha": 25.0, "percentage": 5.0},
            "urban": {"area_ha": 24.5, "percentage": 4.9}
        },
        "output_path": "path/to/classification.tif",
        "vector_path": "path/to/classification.geojson"
    }

    plant_count: {
        "total_plants": 15000,
        "plants_per_hectare": 3000,
        "confidence": 0.92,
        "detection_map_path": "path/to/detections.geojson"
    }

    plant_health: {
        "healthy_percentage": 85.5,
        "stressed_percentage": 10.2,
        "critical_percentage": 4.3,
        "health_map_path": "path/to/health_map.tif"
    }

    height_estimation: {
        "average_height_m": 2.5,
        "min_height_m": 0.8,
        "max_height_m": 4.2,
        "height_map_path": "path/to/height_map.tif"
    }

    soil_analysis: {
        "recommendations": [...],
        "deficiencies": [...],
        "soil_map_path": "path/to/soil_analysis.geojson"
    }

    area: {
        "total_area_ha": 500.0,
        "cultivable_area_ha": 420.0,
        "by_class": {...}
    }
    """

    # Arquivos gerados
    output_files = Column(JSON, nullable=True)  # Lista de arquivos gerados

    # Configurações usadas
    config = Column(JSON, nullable=True)  # Parâmetros da análise

    # Métricas de processamento
    processing_time_seconds = Column(Float, nullable=True)

    # Relacionamentos
    image_id = Column(Integer, ForeignKey("images.id"), nullable=False)
    image = relationship("Image", back_populates="analyses")

    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<Analysis(id={self.id}, type='{self.analysis_type}', status='{self.status}')>"
