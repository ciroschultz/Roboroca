"""
Aerial module schemas - Schemas especificos da Vertente A.
"""

from pydantic import BaseModel, Field


class ROIRequest(BaseModel):
    roi_polygon: list[list[float]] = Field(..., min_length=3)
    analyses: list[str] = Field(
        default=["vegetation", "health", "plant_count"],
        description="Analises a executar dentro do ROI",
    )
