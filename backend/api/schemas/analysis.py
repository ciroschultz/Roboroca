"""
Analysis schemas - Validação de dados de análise.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# --- Request Schemas ---

class AnalysisRequest(BaseModel):
    """Schema para solicitar análise."""
    analysis_type: str = Field(
        ...,
        pattern="^(ndvi|ndwi|evi|savi|classification|area|plant_count|plant_health|height_estimation|soil_analysis|full_report)$"
    )
    config: Optional[Dict[str, Any]] = None


class NDVIRequest(BaseModel):
    """Schema para análise NDVI."""
    red_band: Optional[str] = "B04"  # Banda vermelha
    nir_band: Optional[str] = "B08"  # Banda NIR


class ClassificationRequest(BaseModel):
    """Schema para classificação de uso do solo."""
    model_name: Optional[str] = "unet_landuse"
    classes: Optional[List[str]] = None  # Classes específicas para detectar


class PlantCountRequest(BaseModel):
    """Schema para contagem de plantas."""
    crop_type: Optional[str] = None  # Tipo de cultura
    min_confidence: float = Field(default=0.5, ge=0, le=1)


class PlantHealthRequest(BaseModel):
    """Schema para análise de saúde das plantas."""
    health_index: str = Field(default="ndvi", pattern="^(ndvi|evi|savi|gndvi)$")


# --- Response Schemas ---

class NDVIResult(BaseModel):
    """Resultado de análise NDVI."""
    min: float
    max: float
    mean: float
    std: float
    output_path: Optional[str]
    thumbnail_path: Optional[str]


class ClassArea(BaseModel):
    """Área de uma classe."""
    area_ha: float
    percentage: float


class ClassificationResult(BaseModel):
    """Resultado de classificação."""
    classes: Dict[str, ClassArea]
    output_path: Optional[str]
    vector_path: Optional[str]


class PlantCountResult(BaseModel):
    """Resultado de contagem de plantas."""
    total_plants: int
    plants_per_hectare: float
    confidence: float
    detection_map_path: Optional[str]


class PlantHealthResult(BaseModel):
    """Resultado de análise de saúde."""
    healthy_percentage: float
    stressed_percentage: float
    critical_percentage: float
    health_map_path: Optional[str]


class AnalysisResponse(BaseModel):
    """Schema de resposta de análise."""
    id: int
    analysis_type: str
    status: str
    error_message: Optional[str]
    results: Optional[Dict[str, Any]]
    output_files: Optional[List[str]]
    processing_time_seconds: Optional[float]
    image_id: int
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class AnalysisListResponse(BaseModel):
    """Schema de lista de análises."""
    analyses: List[AnalysisResponse]
    total: int


# --- Report Schema ---

class ReportData(BaseModel):
    """Dados do relatório completo."""
    project_name: str
    image_filename: str
    capture_date: Optional[datetime]
    total_area_ha: Optional[float]
    cultivable_area_ha: Optional[float]
    ndvi: Optional[NDVIResult]
    classification: Optional[ClassificationResult]
    plant_count: Optional[PlantCountResult]
    plant_health: Optional[PlantHealthResult]
    recommendations: Optional[List[str]]
    generated_at: datetime
