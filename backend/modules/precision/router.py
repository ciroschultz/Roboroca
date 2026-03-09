"""
Precision Agriculture Router - Talhões, snapshots, zonas de manejo, prescrições.
"""

import logging
from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from backend.core.database import get_db
from backend.models.user import User
from backend.api.dependencies.auth import get_current_user
from backend.modules.precision.models import (
    Field, FieldSnapshot, ManagementZone, Prescription, ActivityLog,
)
from backend.modules.precision.schemas import (
    FieldCreate, FieldUpdate, FieldResponse, FieldListResponse,
    SnapshotResponse, ZoneResponse,
    PrescriptionCreate, PrescriptionUpdate, PrescriptionResponse,
    PrecisionDashboardStats, ClimateHistoryResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================
# DASHBOARD
# ============================================

@router.get("/dashboard/stats", response_model=PrecisionDashboardStats)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Estatísticas do dashboard de precisão."""
    # Fields
    fields_result = await db.execute(
        select(Field).where(Field.user_id == current_user.id)
    )
    fields = fields_result.scalars().all()

    total_area = sum(f.area_ha or 0 for f in fields)

    # Prescriptions count
    prescription_count = await db.execute(
        select(func.count(Prescription.id)).where(Prescription.user_id == current_user.id)
    )
    total_prescriptions = prescription_count.scalar() or 0

    # Recent activities
    activities_result = await db.execute(
        select(ActivityLog)
        .where(ActivityLog.user_id == current_user.id)
        .order_by(ActivityLog.created_at.desc())
        .limit(10)
    )
    activities = activities_result.scalars().all()

    # Fields summary (with latest snapshot data)
    fields_summary = []
    for field in fields:
        latest_snapshot = await db.execute(
            select(FieldSnapshot)
            .where(FieldSnapshot.field_id == field.id)
            .order_by(FieldSnapshot.snapshot_date.desc())
            .limit(1)
        )
        snap = latest_snapshot.scalar_one_or_none()
        fields_summary.append({
            "id": field.id,
            "name": field.name,
            "area_ha": field.area_ha,
            "crop": field.crop,
            "status": field.status,
            "vegetation_index": snap.vegetation_index_mean if snap else None,
            "last_snapshot": snap.snapshot_date.isoformat() if snap else None,
        })

    return PrecisionDashboardStats(
        total_fields=len(fields),
        total_area_ha=total_area,
        total_prescriptions=total_prescriptions,
        recent_activities=[
            {"id": a.id, "action": a.action, "type": a.activity_type, "field_id": a.field_id, "created_at": a.created_at.isoformat()}
            for a in activities
        ],
        fields_summary=fields_summary,
    )


# ============================================
# FIELDS
# ============================================

@router.post("/fields", response_model=FieldResponse, status_code=status.HTTP_201_CREATED)
async def create_field(
    data: FieldCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Criar talhão."""
    field = Field(user_id=current_user.id, **data.model_dump())
    db.add(field)
    await db.flush()
    await db.refresh(field)

    # Log activity
    log = ActivityLog(
        user_id=current_user.id, field_id=field.id,
        action=f"Talhão '{field.name}' criado", activity_type="field",
    )
    db.add(log)

    return field


@router.get("/fields", response_model=FieldListResponse)
async def list_fields(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Listar talhões do usuário."""
    result = await db.execute(
        select(Field).where(Field.user_id == current_user.id).order_by(Field.created_at.desc())
    )
    fields = result.scalars().all()
    return FieldListResponse(
        items=[FieldResponse.model_validate(f) for f in fields],
        total=len(fields),
    )


@router.get("/fields/{field_id}", response_model=FieldResponse)
async def get_field(
    field_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Detalhe de um talhão."""
    result = await db.execute(
        select(Field).where(Field.id == field_id, Field.user_id == current_user.id)
    )
    field = result.scalar_one_or_none()
    if not field:
        raise HTTPException(status_code=404, detail="Talhão não encontrado")
    return field


@router.put("/fields/{field_id}", response_model=FieldResponse)
async def update_field(
    field_id: int,
    data: FieldUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Atualizar talhão."""
    result = await db.execute(
        select(Field).where(Field.id == field_id, Field.user_id == current_user.id)
    )
    field = result.scalar_one_or_none()
    if not field:
        raise HTTPException(status_code=404, detail="Talhão não encontrado")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(field, key, value)

    await db.flush()
    await db.refresh(field)
    return field


@router.delete("/fields/{field_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_field(
    field_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Deletar talhão."""
    result = await db.execute(
        select(Field).where(Field.id == field_id, Field.user_id == current_user.id)
    )
    field = result.scalar_one_or_none()
    if not field:
        raise HTTPException(status_code=404, detail="Talhão não encontrado")
    await db.delete(field)


# ============================================
# SNAPSHOTS
# ============================================

@router.post("/fields/{field_id}/snapshot", response_model=SnapshotResponse)
async def capture_snapshot(
    field_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Capturar snapshot: buscar dados de satélite, clima, solo e calcular índice de vegetação."""
    result = await db.execute(
        select(Field).where(Field.id == field_id, Field.user_id == current_user.id)
    )
    field = result.scalar_one_or_none()
    if not field:
        raise HTTPException(status_code=404, detail="Talhão não encontrado")

    if not field.center_lat or not field.center_lon:
        raise HTTPException(status_code=400, detail="Talhão sem coordenadas definidas")

    lat, lon = field.center_lat, field.center_lon

    # Fetch external data in parallel
    weather_data = None
    soil_data = None
    vegetation_mean = None
    vegetation_min = None
    vegetation_max = None
    sat_image_path = None

    try:
        from backend.services.external.weather import get_weather_data
        weather_data = await get_weather_data(lat, lon)
    except Exception as e:
        logger.warning("Failed to fetch weather for field %d: %s", field_id, e)

    try:
        from backend.services.external.soil import get_soil_data
        soil_data = await get_soil_data(lat, lon)
    except Exception as e:
        logger.warning("Failed to fetch soil for field %d: %s", field_id, e)

    # Tentar NDVI real via Sentinel primeiro
    ndvi_source = "exg"
    try:
        from backend.services.external.sentinel_ndvi import get_sentinel_ndvi
        sentinel_result = await get_sentinel_ndvi(lat, lon)
        if sentinel_result.get("data_source") == "sentinel" and sentinel_result.get("ndvi_mean") is not None:
            vegetation_mean = sentinel_result["ndvi_mean"]
            vegetation_min = sentinel_result["ndvi_min"]
            vegetation_max = sentinel_result["ndvi_max"]
            ndvi_source = "sentinel"
    except Exception as e:
        logger.warning("Failed to fetch Sentinel NDVI for field %d: %s", field_id, e)

    try:
        from backend.services.external.satellite_imagery import fetch_satellite_image
        sat_result = await fetch_satellite_image(lat, lon)
        if sat_result and sat_result.get("file_path"):
            sat_image_path = sat_result["file_path"]

            # Se Sentinel não retornou NDVI, calcular ExG do RGB
            if ndvi_source == "exg":
                try:
                    from PIL import Image as PILImage
                    import numpy as np

                    img = PILImage.open(sat_image_path).convert("RGB")
                    arr = np.array(img, dtype=np.float32)
                    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
                    total = r + g + b + 1e-6  # avoid division by zero
                    exg = 2 * (g / total) - (r / total) - (b / total)
                    # Normalize to 0-1 range (ExG ranges from -1 to 1)
                    exg_norm = (exg + 1) / 2
                    vegetation_mean = float(np.mean(exg_norm))
                    vegetation_min = float(np.min(exg_norm))
                    vegetation_max = float(np.max(exg_norm))
                except Exception as e:
                    logger.warning("Failed to compute ExG for field %d: %s", field_id, e)
    except Exception as e:
        logger.warning("Failed to fetch satellite image for field %d: %s", field_id, e)

    snapshot = FieldSnapshot(
        field_id=field.id,
        vegetation_index_mean=vegetation_mean,
        vegetation_index_min=vegetation_min,
        vegetation_index_max=vegetation_max,
        weather_data=weather_data,
        soil_data=soil_data,
        satellite_image_path=sat_image_path,
        ndvi_source=ndvi_source,
    )
    db.add(snapshot)

    # Log activity
    log = ActivityLog(
        user_id=current_user.id, field_id=field.id,
        action=f"Snapshot capturado para '{field.name}'", activity_type="snapshot",
    )
    db.add(log)

    await db.flush()
    await db.refresh(snapshot)
    return snapshot


@router.get("/fields/{field_id}/snapshots", response_model=list[SnapshotResponse])
async def list_snapshots(
    field_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Histórico de snapshots de um talhão."""
    # Verify ownership
    field_check = await db.execute(
        select(Field.id).where(Field.id == field_id, Field.user_id == current_user.id)
    )
    if not field_check.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Talhão não encontrado")

    result = await db.execute(
        select(FieldSnapshot)
        .where(FieldSnapshot.field_id == field_id)
        .order_by(FieldSnapshot.snapshot_date.desc())
    )
    return result.scalars().all()


@router.get("/fields/{field_id}/weather")
async def get_field_weather(
    field_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Dados climáticos atuais do talhão (proxy Open-Meteo)."""
    result = await db.execute(
        select(Field).where(Field.id == field_id, Field.user_id == current_user.id)
    )
    field = result.scalar_one_or_none()
    if not field:
        raise HTTPException(status_code=404, detail="Talhão não encontrado")
    if not field.center_lat or not field.center_lon:
        raise HTTPException(status_code=400, detail="Talhão sem coordenadas")

    from backend.services.external.weather import get_weather_data
    return await get_weather_data(field.center_lat, field.center_lon)


@router.get("/fields/{field_id}/soil")
async def get_field_soil(
    field_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Dados de solo do talhão (proxy SoilGrids, cacheado no último snapshot)."""
    result = await db.execute(
        select(Field).where(Field.id == field_id, Field.user_id == current_user.id)
    )
    field = result.scalar_one_or_none()
    if not field:
        raise HTTPException(status_code=404, detail="Talhão não encontrado")

    # Try cached from latest snapshot first
    latest = await db.execute(
        select(FieldSnapshot)
        .where(FieldSnapshot.field_id == field_id, FieldSnapshot.soil_data.isnot(None))
        .order_by(FieldSnapshot.snapshot_date.desc())
        .limit(1)
    )
    snap = latest.scalar_one_or_none()
    if snap and snap.soil_data:
        return snap.soil_data

    if not field.center_lat or not field.center_lon:
        raise HTTPException(status_code=400, detail="Talhão sem coordenadas")

    from backend.services.external.soil import get_soil_data
    return await get_soil_data(field.center_lat, field.center_lon)


@router.get("/fields/{field_id}/climate-history", response_model=ClimateHistoryResponse)
async def get_field_climate_history(
    field_id: int,
    months: int = Query(12, ge=1, le=120),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Dados climáticos históricos do talhão via NASA POWER API."""
    result = await db.execute(
        select(Field).where(Field.id == field_id, Field.user_id == current_user.id)
    )
    field = result.scalar_one_or_none()
    if not field:
        raise HTTPException(status_code=404, detail="Talhão não encontrado")
    if not field.center_lat or not field.center_lon:
        raise HTTPException(status_code=400, detail="Talhão sem coordenadas")

    from datetime import date, timedelta
    end_date = date.today()
    start_date = end_date - timedelta(days=months * 30)

    from backend.services.external.nasa_power import get_climate_history
    data = await get_climate_history(field.center_lat, field.center_lon, start_date, end_date)
    return data


# ============================================
# MANAGEMENT ZONES
# ============================================

@router.post("/fields/{field_id}/zones/generate", response_model=list[ZoneResponse])
async def generate_zones(
    field_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Gerar zonas de manejo baseadas no índice de vegetação."""
    result = await db.execute(
        select(Field).where(Field.id == field_id, Field.user_id == current_user.id)
    )
    field = result.scalar_one_or_none()
    if not field:
        raise HTTPException(status_code=404, detail="Talhão não encontrado")

    # Get latest snapshot with vegetation data
    latest = await db.execute(
        select(FieldSnapshot)
        .where(FieldSnapshot.field_id == field_id, FieldSnapshot.vegetation_index_mean.isnot(None))
        .order_by(FieldSnapshot.snapshot_date.desc())
        .limit(1)
    )
    snap = latest.scalar_one_or_none()
    if not snap:
        raise HTTPException(status_code=400, detail="Nenhum snapshot com dados de vegetação. Capture um snapshot primeiro.")

    # Delete existing zones
    from sqlalchemy import delete
    await db.execute(delete(ManagementZone).where(ManagementZone.field_id == field_id))

    # Generate zones based on vegetation index ranges
    total_area = field.area_ha or 100
    veg_mean = snap.vegetation_index_mean or 0.5
    veg_range = (snap.vegetation_index_max or 1) - (snap.vegetation_index_min or 0)

    zone_defs = [
        {"zone_type": "alta", "label": "Alta Produtividade", "fraction": 0.35, "ndvi_min": veg_mean + veg_range * 0.1, "ndvi_max": snap.vegetation_index_max or 1},
        {"zone_type": "media", "label": "Média Produtividade", "fraction": 0.30, "ndvi_min": veg_mean - veg_range * 0.1, "ndvi_max": veg_mean + veg_range * 0.1},
        {"zone_type": "baixa", "label": "Baixa Produtividade", "fraction": 0.20, "ndvi_min": snap.vegetation_index_min or 0, "ndvi_max": veg_mean - veg_range * 0.1},
        {"zone_type": "recuperacao", "label": "Recuperação", "fraction": 0.15, "ndvi_min": 0, "ndvi_max": snap.vegetation_index_min or 0.2},
    ]

    zones = []
    for zd in zone_defs:
        zone = ManagementZone(
            field_id=field.id,
            zone_type=zd["zone_type"],
            area_ha=round(total_area * zd["fraction"], 1),
            ndvi_range={"min": round(zd["ndvi_min"], 3), "max": round(zd["ndvi_max"], 3)},
        )
        db.add(zone)
        zones.append(zone)

    # Log activity
    log = ActivityLog(
        user_id=current_user.id, field_id=field.id,
        action=f"Zonas de manejo geradas para '{field.name}'", activity_type="zone",
    )
    db.add(log)

    await db.flush()
    for z in zones:
        await db.refresh(z)
    return zones


@router.get("/fields/{field_id}/zones", response_model=list[ZoneResponse])
async def list_zones(
    field_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Listar zonas de manejo de um talhão."""
    field_check = await db.execute(
        select(Field.id).where(Field.id == field_id, Field.user_id == current_user.id)
    )
    if not field_check.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Talhão não encontrado")

    result = await db.execute(
        select(ManagementZone).where(ManagementZone.field_id == field_id)
    )
    return result.scalars().all()


# ============================================
# PRESCRIPTIONS
# ============================================

@router.post("/prescriptions", response_model=PrescriptionResponse, status_code=status.HTTP_201_CREATED)
async def create_prescription(
    data: PrescriptionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Criar prescrição de aplicação."""
    # Verify field ownership
    field_check = await db.execute(
        select(Field.id).where(Field.id == data.field_id, Field.user_id == current_user.id)
    )
    if not field_check.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Talhão não encontrado")

    prescription = Prescription(user_id=current_user.id, **data.model_dump())
    db.add(prescription)

    # Log
    log = ActivityLog(
        user_id=current_user.id, field_id=data.field_id,
        action=f"Prescrição '{data.product_name}' criada", activity_type="prescription",
    )
    db.add(log)

    await db.flush()
    await db.refresh(prescription)
    return prescription


@router.get("/prescriptions", response_model=list[PrescriptionResponse])
async def list_prescriptions(
    field_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Listar prescrições."""
    query = select(Prescription).where(Prescription.user_id == current_user.id)
    if field_id:
        query = query.where(Prescription.field_id == field_id)
    query = query.order_by(Prescription.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.put("/prescriptions/{prescription_id}", response_model=PrescriptionResponse)
async def update_prescription(
    prescription_id: int,
    data: PrescriptionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Atualizar prescrição (status, taxa, etc)."""
    result = await db.execute(
        select(Prescription).where(
            Prescription.id == prescription_id,
            Prescription.user_id == current_user.id,
        )
    )
    prescription = result.scalar_one_or_none()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescrição não encontrada")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(prescription, key, value)

    await db.flush()
    await db.refresh(prescription)
    return prescription
