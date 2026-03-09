"""
Spectral Analysis schemas.
"""

from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


# ---- Samples ----

class SampleCreate(BaseModel):
    sample_code: str = Field(..., min_length=1, max_length=100)
    species: str = Field(..., min_length=1, max_length=100)
    technique: str = "raman"


class SampleUpdate(BaseModel):
    sample_code: Optional[str] = None
    species: Optional[str] = None
    technique: Optional[str] = None
    status: Optional[str] = None


class SampleResponse(BaseModel):
    id: int
    sample_code: str
    species: str
    technique: str
    status: str
    ratio: Optional[float] = None
    lignin_percent: Optional[float] = None
    cellulose_percent: Optional[float] = None
    spectrum_data: Optional[list[dict[str, Any]]] = None
    analyzed_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SampleListResponse(BaseModel):
    items: list[SampleResponse]
    total: int
    page: int
    per_page: int


# ---- Library ----

class LibraryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    species: str = Field(..., min_length=1, max_length=100)
    technique: str = "raman"
    ratio: Optional[float] = None
    lignin_percent: Optional[float] = None
    cellulose_percent: Optional[float] = None
    spectrum_data: Optional[list[dict[str, Any]]] = None


class LibraryResponse(BaseModel):
    id: int
    name: str
    species: str
    technique: str
    ratio: Optional[float] = None
    lignin_percent: Optional[float] = None
    cellulose_percent: Optional[float] = None
    spectrum_data: Optional[list[dict[str, Any]]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ---- Calibration ----

class CalibrationPointCreate(BaseModel):
    technique: str = "raman"
    species: Optional[str] = None
    ratio: float
    lignin_reference: float


class CalibrationPointResponse(BaseModel):
    id: int
    technique: str
    species: Optional[str] = None
    ratio: float
    lignin_reference: float
    created_at: datetime

    model_config = {"from_attributes": True}


class CalibrationFitResponse(BaseModel):
    slope: float
    intercept: float
    r_squared: float
    n_points: int


# ---- Dashboard ----

class SpectralDashboardStats(BaseModel):
    total_samples: int
    analyzed_count: int
    pending_count: int
    species_distribution: list[dict[str, Any]]
    monthly_analyses: list[dict[str, Any]]
