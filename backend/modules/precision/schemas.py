"""
Precision Agriculture schemas.
"""

from datetime import datetime, date
from typing import Any, Optional
from pydantic import BaseModel, Field


# ---- Fields ----

class FieldCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    area_ha: Optional[float] = None
    crop: Optional[str] = None
    status: str = "ativo"
    geometry: Optional[dict[str, Any]] = None  # GeoJSON
    center_lat: Optional[float] = None
    center_lon: Optional[float] = None
    planting_date: Optional[date] = None
    expected_harvest: Optional[date] = None
    notes: Optional[str] = None


class FieldUpdate(BaseModel):
    name: Optional[str] = None
    area_ha: Optional[float] = None
    crop: Optional[str] = None
    status: Optional[str] = None
    geometry: Optional[dict[str, Any]] = None
    center_lat: Optional[float] = None
    center_lon: Optional[float] = None
    planting_date: Optional[date] = None
    expected_harvest: Optional[date] = None
    notes: Optional[str] = None


class FieldResponse(BaseModel):
    id: int
    name: str
    area_ha: Optional[float] = None
    crop: Optional[str] = None
    status: str
    geometry: Optional[dict[str, Any]] = None
    center_lat: Optional[float] = None
    center_lon: Optional[float] = None
    planting_date: Optional[date] = None
    expected_harvest: Optional[date] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class FieldListResponse(BaseModel):
    items: list[FieldResponse]
    total: int


# ---- Snapshots ----

class SnapshotResponse(BaseModel):
    id: int
    field_id: int
    snapshot_date: datetime
    vegetation_index_mean: Optional[float] = None
    vegetation_index_min: Optional[float] = None
    vegetation_index_max: Optional[float] = None
    weather_data: Optional[dict[str, Any]] = None
    soil_data: Optional[dict[str, Any]] = None
    satellite_image_path: Optional[str] = None
    ndvi_source: Optional[str] = None

    model_config = {"from_attributes": True}


# ---- Management Zones ----

class ZoneResponse(BaseModel):
    id: int
    field_id: int
    zone_type: str
    geometry: Optional[dict[str, Any]] = None
    area_ha: Optional[float] = None
    ndvi_range: Optional[dict[str, Any]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ---- Prescriptions ----

class PrescriptionCreate(BaseModel):
    field_id: int
    type: str = Field(..., min_length=1)
    product_name: str = Field(..., min_length=1)
    rate_per_ha: Optional[float] = None
    total_quantity: Optional[float] = None
    zone_id: Optional[int] = None


class PrescriptionUpdate(BaseModel):
    status: Optional[str] = None
    rate_per_ha: Optional[float] = None
    total_quantity: Optional[float] = None
    applied_at: Optional[datetime] = None


class PrescriptionResponse(BaseModel):
    id: int
    field_id: int
    type: str
    product_name: str
    rate_per_ha: Optional[float] = None
    total_quantity: Optional[float] = None
    status: str
    zone_id: Optional[int] = None
    applied_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ---- Climate History ----

class ClimateHistoryResponse(BaseModel):
    source: str = "NASA POWER"
    coordinates: Optional[dict[str, float]] = None
    period: Optional[dict[str, str]] = None
    monthly_averages: list[dict[str, Any]] = []
    period_stats: Optional[dict[str, Any]] = None
    parameters_description: Optional[dict[str, Any]] = None
    error: Optional[str] = None


# ---- Dashboard ----

class PrecisionDashboardStats(BaseModel):
    total_fields: int
    total_area_ha: float
    total_prescriptions: int
    recent_activities: list[dict[str, Any]]
    fields_summary: list[dict[str, Any]]
