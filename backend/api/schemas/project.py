"""
Project schemas - Validação de dados de projeto.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# --- Request Schemas ---

class ProjectCreate(BaseModel):
    """Schema para criar projeto."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    location: Optional[str] = Field(None, max_length=255)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    total_area_ha: Optional[float] = Field(None, ge=0)


class ProjectUpdate(BaseModel):
    """Schema para atualizar projeto."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    location: Optional[str] = Field(None, max_length=255)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    total_area_ha: Optional[float] = Field(None, ge=0)


# --- Response Schemas ---

class ProjectResponse(BaseModel):
    """Schema de resposta de projeto."""
    id: int
    name: str
    description: Optional[str]
    status: str = "pending"
    location: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    total_area_ha: Optional[float]
    area_hectares: Optional[float] = None  # Alias para compatibilidade
    image_count: int = 0
    owner_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectListResponse(BaseModel):
    """Schema de lista de projetos."""
    projects: List[ProjectResponse]
    total: int
