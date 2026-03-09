"""
Calculator schemas - Pydantic models para validação.
"""

from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class CalculationCreate(BaseModel):
    calc_type: str = Field(..., min_length=1, max_length=50, description="Tipo do cálculo")
    title: str = Field(..., min_length=1, max_length=255, description="Título descritivo")
    inputs: dict[str, Any] = Field(..., description="Parâmetros de entrada do cálculo")
    result: dict[str, Any] = Field(..., description="Resultado completo do cálculo")
    result_summary: str = Field(..., min_length=1, description="Resumo legível do resultado")


class CalculationResponse(BaseModel):
    id: int
    calc_type: str
    title: str
    inputs: dict[str, Any]
    result: dict[str, Any]
    result_summary: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CalculationListResponse(BaseModel):
    items: list[CalculationResponse]
    total: int
    page: int
    per_page: int


class CalculationStats(BaseModel):
    total: int
    by_type: list[dict[str, Any]]  # [{name, value, color}]
    monthly: list[dict[str, Any]]  # [{mes, calculos}]
