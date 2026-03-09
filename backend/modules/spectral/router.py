"""
Spectral Analysis Router - Amostras, biblioteca, calibração.
"""

import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from backend.core.database import get_db
from backend.core.config import settings
from backend.models.user import User
from backend.api.dependencies.auth import get_current_user
from backend.modules.spectral.models import SpectralSample, CalibrationPoint, LibrarySpectrum
from backend.modules.spectral.schemas import (
    SampleCreate, SampleUpdate, SampleResponse, SampleListResponse,
    LibraryCreate, LibraryResponse,
    CalibrationPointCreate, CalibrationPointResponse, CalibrationFitResponse,
    SpectralDashboardStats,
)
from backend.modules.spectral.spectrum_processor import (
    analyze_spectrum, linear_regression, parse_csv_spectrum,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================
# DASHBOARD
# ============================================

@router.get("/dashboard/stats", response_model=SpectralDashboardStats)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Estatísticas do dashboard espectral."""
    base_filter = SpectralSample.user_id == current_user.id

    total = (await db.execute(select(func.count(SpectralSample.id)).where(base_filter))).scalar() or 0
    analyzed = (await db.execute(
        select(func.count(SpectralSample.id)).where(base_filter, SpectralSample.status == "analisada")
    )).scalar() or 0
    pending = total - analyzed

    # Species distribution
    species_result = await db.execute(
        select(SpectralSample.species, func.count(SpectralSample.id))
        .where(base_filter)
        .group_by(SpectralSample.species)
    )
    species_colors = {
        "E. urograndis": "#8B5CF6",
        "E. grandis": "#10B981",
        "E. urophylla": "#F59E0B",
        "E. saligna": "#EF4444",
    }
    species_distribution = [
        {"name": species, "value": count, "color": species_colors.get(species, "#6B7280")}
        for species, count in species_result.all()
    ]

    # Monthly analyses (last 6 months)
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    monthly = []
    month_names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    for i in range(5, -1, -1):
        month_date = now - timedelta(days=30 * i)
        month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if i > 0:
            next_month = (month_date + timedelta(days=32)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            next_month = now + timedelta(days=1)
        count = (await db.execute(
            select(func.count(SpectralSample.id)).where(
                base_filter,
                SpectralSample.status == "analisada",
                SpectralSample.analyzed_at >= month_start,
                SpectralSample.analyzed_at < next_month,
            )
        )).scalar() or 0
        monthly.append({"mes": month_names[month_start.month - 1], "análises": count})

    return SpectralDashboardStats(
        total_samples=total,
        analyzed_count=analyzed,
        pending_count=pending,
        species_distribution=species_distribution,
        monthly_analyses=monthly,
    )


# ============================================
# SAMPLES
# ============================================

@router.post("/samples", response_model=SampleResponse, status_code=status.HTTP_201_CREATED)
async def create_sample(
    data: SampleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Criar amostra espectral."""
    sample = SpectralSample(user_id=current_user.id, **data.model_dump())
    db.add(sample)
    await db.flush()
    await db.refresh(sample)
    return sample


@router.get("/samples", response_model=SampleListResponse)
async def list_samples(
    species: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Listar amostras."""
    query = select(SpectralSample).where(SpectralSample.user_id == current_user.id)
    count_query = select(func.count(SpectralSample.id)).where(SpectralSample.user_id == current_user.id)

    if species:
        query = query.where(SpectralSample.species == species)
        count_query = count_query.where(SpectralSample.species == species)
    if status_filter:
        query = query.where(SpectralSample.status == status_filter)
        count_query = count_query.where(SpectralSample.status == status_filter)

    total = (await db.execute(count_query)).scalar() or 0
    query = query.order_by(SpectralSample.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)

    return SampleListResponse(
        items=[SampleResponse.model_validate(s) for s in result.scalars().all()],
        total=total, page=page, per_page=per_page,
    )


@router.get("/samples/{sample_id}", response_model=SampleResponse)
async def get_sample(
    sample_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Detalhe de uma amostra."""
    result = await db.execute(
        select(SpectralSample).where(SpectralSample.id == sample_id, SpectralSample.user_id == current_user.id)
    )
    sample = result.scalar_one_or_none()
    if not sample:
        raise HTTPException(status_code=404, detail="Amostra não encontrada")
    return sample


@router.put("/samples/{sample_id}", response_model=SampleResponse)
async def update_sample(
    sample_id: int,
    data: SampleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Atualizar amostra."""
    result = await db.execute(
        select(SpectralSample).where(SpectralSample.id == sample_id, SpectralSample.user_id == current_user.id)
    )
    sample = result.scalar_one_or_none()
    if not sample:
        raise HTTPException(status_code=404, detail="Amostra não encontrada")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(sample, key, value)
    await db.flush()
    await db.refresh(sample)
    return sample


@router.delete("/samples/{sample_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sample(
    sample_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Deletar amostra."""
    result = await db.execute(
        select(SpectralSample).where(SpectralSample.id == sample_id, SpectralSample.user_id == current_user.id)
    )
    sample = result.scalar_one_or_none()
    if not sample:
        raise HTTPException(status_code=404, detail="Amostra não encontrada")
    await db.delete(sample)


@router.post("/samples/{sample_id}/upload", response_model=SampleResponse)
async def upload_spectrum(
    sample_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload CSV do espectro para uma amostra."""
    result = await db.execute(
        select(SpectralSample).where(SpectralSample.id == sample_id, SpectralSample.user_id == current_user.id)
    )
    sample = result.scalar_one_or_none()
    if not sample:
        raise HTTPException(status_code=404, detail="Amostra não encontrada")

    content = await file.read()
    csv_text = content.decode("utf-8")
    spectrum_data = parse_csv_spectrum(csv_text)

    if len(spectrum_data) < 10:
        raise HTTPException(status_code=400, detail="CSV inválido — menos de 10 pontos espectrais")

    # Save file
    upload_dir = os.path.join(settings.UPLOAD_DIR, "spectra")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, f"{uuid.uuid4()}.csv")
    with open(file_path, "wb") as f:
        f.write(content)

    sample.spectrum_data = spectrum_data
    sample.spectrum_file_path = file_path
    await db.flush()
    await db.refresh(sample)
    return sample


@router.post("/samples/{sample_id}/analyze", response_model=SampleResponse)
async def analyze_sample(
    sample_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Analisar amostra: calcular ratio lignina/celulose e percentuais."""
    result = await db.execute(
        select(SpectralSample).where(SpectralSample.id == sample_id, SpectralSample.user_id == current_user.id)
    )
    sample = result.scalar_one_or_none()
    if not sample:
        raise HTTPException(status_code=404, detail="Amostra não encontrada")

    if not sample.spectrum_data:
        raise HTTPException(status_code=400, detail="Amostra sem dados espectrais. Faça upload primeiro.")

    # Check for user calibration curve
    calibration = None
    cal_points = await db.execute(
        select(CalibrationPoint).where(
            CalibrationPoint.user_id == current_user.id,
            CalibrationPoint.technique == sample.technique,
        )
    )
    points = cal_points.scalars().all()
    if len(points) >= 3:
        reg = linear_regression([{"x": p.ratio, "y": p.lignin_reference} for p in points])
        if reg["r_squared"] > 0.5:
            calibration = {"slope": reg["slope"], "intercept": reg["intercept"]}

    analysis = analyze_spectrum(sample.spectrum_data, sample.technique, calibration)

    sample.ratio = analysis["ratio"]
    sample.lignin_percent = analysis["lignin_percent"]
    sample.cellulose_percent = analysis["cellulose_percent"]
    sample.status = "analisada"
    sample.analyzed_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(sample)
    return sample


# ============================================
# LIBRARY
# ============================================

@router.get("/library", response_model=list[LibraryResponse])
async def list_library(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Listar espectros da biblioteca (do usuário + globais)."""
    result = await db.execute(
        select(LibrarySpectrum).where(
            (LibrarySpectrum.user_id == current_user.id) | (LibrarySpectrum.user_id.is_(None))
        ).order_by(LibrarySpectrum.name)
    )
    return result.scalars().all()


@router.post("/library", response_model=LibraryResponse, status_code=status.HTTP_201_CREATED)
async def add_to_library(
    data: LibraryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Adicionar espectro à biblioteca."""
    entry = LibrarySpectrum(user_id=current_user.id, **data.model_dump())
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    return entry


@router.delete("/library/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_library(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remover espectro da biblioteca."""
    result = await db.execute(
        select(LibrarySpectrum).where(LibrarySpectrum.id == entry_id, LibrarySpectrum.user_id == current_user.id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Espectro não encontrado na biblioteca")
    await db.delete(entry)


# ============================================
# CALIBRATION
# ============================================

@router.get("/calibration", response_model=list[CalibrationPointResponse])
async def list_calibration(
    technique: str = Query("raman"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Listar pontos de calibração."""
    result = await db.execute(
        select(CalibrationPoint).where(
            CalibrationPoint.user_id == current_user.id,
            CalibrationPoint.technique == technique,
        ).order_by(CalibrationPoint.ratio)
    )
    return result.scalars().all()


@router.post("/calibration", response_model=CalibrationPointResponse, status_code=status.HTTP_201_CREATED)
async def add_calibration_point(
    data: CalibrationPointCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Adicionar ponto de calibração."""
    point = CalibrationPoint(user_id=current_user.id, **data.model_dump())
    db.add(point)
    await db.flush()
    await db.refresh(point)
    return point


@router.delete("/calibration/{point_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_calibration_point(
    point_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remover ponto de calibração."""
    result = await db.execute(
        select(CalibrationPoint).where(CalibrationPoint.id == point_id, CalibrationPoint.user_id == current_user.id)
    )
    point = result.scalar_one_or_none()
    if not point:
        raise HTTPException(status_code=404, detail="Ponto não encontrado")
    await db.delete(point)


@router.post("/calibration/fit", response_model=CalibrationFitResponse)
async def fit_calibration(
    technique: str = Query("raman"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Calcular regressão linear da curva de calibração."""
    result = await db.execute(
        select(CalibrationPoint).where(
            CalibrationPoint.user_id == current_user.id,
            CalibrationPoint.technique == technique,
        )
    )
    points = result.scalars().all()
    if len(points) < 2:
        raise HTTPException(status_code=400, detail="Mínimo de 2 pontos para regressão")

    reg = linear_regression([{"x": p.ratio, "y": p.lignin_reference} for p in points])

    return CalibrationFitResponse(
        slope=reg["slope"],
        intercept=reg["intercept"],
        r_squared=reg["r_squared"],
        n_points=len(points),
    )
