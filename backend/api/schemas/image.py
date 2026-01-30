"""
Image schemas - Validação de dados de imagem.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# --- Request Schemas ---

class ImageCreate(BaseModel):
    """Schema para criar registro de imagem."""
    project_id: int
    image_type: str = Field(default="drone", pattern="^(drone|satellite|aerial)$")
    source: Optional[str] = None
    capture_date: Optional[datetime] = None


class ImageUpdate(BaseModel):
    """Schema para atualizar imagem."""
    image_type: Optional[str] = Field(None, pattern="^(drone|satellite|aerial)$")
    source: Optional[str] = None
    capture_date: Optional[datetime] = None


# --- Response Schemas ---

class ImageResponse(BaseModel):
    """Schema de resposta de imagem."""
    id: int
    filename: str
    original_filename: str
    file_size: Optional[int]
    mime_type: Optional[str]
    image_type: str
    source: Optional[str]
    width: Optional[int]
    height: Optional[int]
    crs: Optional[str]
    bounds: Optional[Dict[str, float]]
    center_lat: Optional[float]
    center_lon: Optional[float]
    resolution: Optional[float]
    bands: Optional[List[str]]
    capture_date: Optional[datetime]
    status: str
    project_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ImageListResponse(BaseModel):
    """Schema de lista de imagens."""
    images: List[ImageResponse]
    total: int


class ImageMetadata(BaseModel):
    """Schema de metadados da imagem."""
    width: Optional[int]
    height: Optional[int]
    crs: Optional[str]
    bounds: Optional[Dict[str, float]]
    center_lat: Optional[float]
    center_lon: Optional[float]
    resolution: Optional[float]
    bands: Optional[List[str]]
    file_size: Optional[int]


class UploadResponse(BaseModel):
    """Schema de resposta de upload."""
    message: str
    image: ImageResponse
