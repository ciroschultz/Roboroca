"""
Calculator Router - CRUD de cálculos agrícolas.
"""

import logging
from typing import Optional
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete, extract

from backend.core.database import get_db
from backend.models.user import User
from backend.api.dependencies.auth import get_current_user
from backend.modules.calculator.models import Calculation
from backend.modules.calculator.schemas import (
    CalculationCreate,
    CalculationResponse,
    CalculationListResponse,
    CalculationStats,
)

logger = logging.getLogger(__name__)

router = APIRouter()

CALC_TYPE_COLORS = {
    "conversao": "#F59E0B",
    "custo_producao": "#3B82F6",
    "produtividade": "#6AAF3D",
    "pecuaria": "#EF4444",
    "insumos": "#8B5CF6",
    "irrigacao": "#06B6D4",
    "financiamento": "#F97316",
}

CALC_TYPE_LABELS = {
    "conversao": "Conversão",
    "custo_producao": "Custo Produção",
    "produtividade": "Produtividade",
    "pecuaria": "Pecuária",
    "insumos": "Insumos",
    "irrigacao": "Irrigação",
    "financiamento": "Financiamento",
}


@router.get("/calculations/stats", response_model=CalculationStats)
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Estatísticas dos cálculos do usuário."""
    # Total
    total_result = await db.execute(
        select(func.count(Calculation.id)).where(Calculation.user_id == current_user.id)
    )
    total = total_result.scalar() or 0

    # By type
    type_result = await db.execute(
        select(Calculation.calc_type, func.count(Calculation.id))
        .where(Calculation.user_id == current_user.id)
        .group_by(Calculation.calc_type)
    )
    by_type = []
    for calc_type, count in type_result.all():
        by_type.append({
            "name": CALC_TYPE_LABELS.get(calc_type, calc_type),
            "value": count,
            "color": CALC_TYPE_COLORS.get(calc_type, "#9CA3AF"),
        })

    # Monthly (last 7 months)
    now = datetime.now(timezone.utc)
    monthly = []
    for i in range(6, -1, -1):
        month_date = now - timedelta(days=30 * i)
        month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if i > 0:
            next_month = (month_date + timedelta(days=32)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            next_month = now + timedelta(days=1)

        count_result = await db.execute(
            select(func.count(Calculation.id)).where(
                Calculation.user_id == current_user.id,
                Calculation.created_at >= month_start,
                Calculation.created_at < next_month,
            )
        )
        count = count_result.scalar() or 0
        month_names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
        monthly.append({
            "mes": month_names[month_start.month - 1],
            "cálculos": count,
        })

    return CalculationStats(total=total, by_type=by_type, monthly=monthly)


@router.post("/calculations", response_model=CalculationResponse, status_code=status.HTTP_201_CREATED)
async def create_calculation(
    data: CalculationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Salvar um cálculo."""
    calc = Calculation(
        user_id=current_user.id,
        calc_type=data.calc_type,
        title=data.title,
        inputs=data.inputs,
        result=data.result,
        result_summary=data.result_summary,
    )
    db.add(calc)
    await db.flush()
    await db.refresh(calc)
    return calc


@router.get("/calculations", response_model=CalculationListResponse)
async def list_calculations(
    calc_type: Optional[str] = Query(None, description="Filtrar por tipo"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Listar cálculos do usuário com paginação."""
    query = select(Calculation).where(Calculation.user_id == current_user.id)
    count_query = select(func.count(Calculation.id)).where(Calculation.user_id == current_user.id)

    if calc_type:
        query = query.where(Calculation.calc_type == calc_type)
        count_query = count_query.where(Calculation.calc_type == calc_type)

    # Total
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginated results
    query = query.order_by(Calculation.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    items = result.scalars().all()

    return CalculationListResponse(
        items=[CalculationResponse.model_validate(c) for c in items],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/calculations/{calc_id}", response_model=CalculationResponse)
async def get_calculation(
    calc_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Detalhe de um cálculo."""
    result = await db.execute(
        select(Calculation).where(
            Calculation.id == calc_id,
            Calculation.user_id == current_user.id,
        )
    )
    calc = result.scalar_one_or_none()
    if not calc:
        raise HTTPException(status_code=404, detail="Cálculo não encontrado")
    return calc


@router.delete("/calculations/{calc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_calculation(
    calc_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Deletar um cálculo."""
    result = await db.execute(
        select(Calculation).where(
            Calculation.id == calc_id,
            Calculation.user_id == current_user.id,
        )
    )
    calc = result.scalar_one_or_none()
    if not calc:
        raise HTTPException(status_code=404, detail="Cálculo não encontrado")
    await db.delete(calc)
