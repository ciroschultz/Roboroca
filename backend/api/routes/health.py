"""
Health Check Routes
Endpoints para verificar a saúde da API e metricas Prometheus.
"""

import logging
import os
import shutil

from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from backend.core.config import settings
from backend.core.database import get_db
from backend.services.metrics import metrics

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health")
async def health_check():
    """Verifica se a API está funcionando."""
    metrics.inc("roboroca_health_checks_total")
    return {
        "status": "healthy",
        "service": "roboroca-api",
        "version": settings.VERSION,
    }


@router.get("/health/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """Verifica se a API está pronta para receber requisições."""
    checks = {}

    # Database
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "connected"
    except Exception as e:
        logger.error("Database health check failed: %s", e)
        checks["database"] = "disconnected"

    # Redis (optional)
    redis_status = "not_configured"
    try:
        import redis
        r = redis.from_url(settings.REDIS_URL, socket_timeout=2)
        r.ping()
        redis_status = "connected"
    except Exception:
        redis_status = "unavailable"
    checks["redis"] = redis_status

    # Disk space
    try:
        disk = shutil.disk_usage(settings.UPLOAD_DIR)
        free_gb = disk.free / (1024**3)
        checks["disk_free_gb"] = round(free_gb, 1)
        checks["disk"] = "ok" if free_gb > 1.0 else "low"
        metrics.set_gauge("roboroca_disk_free_bytes", disk.free)
    except Exception:
        checks["disk"] = "unknown"

    # ML models directory
    try:
        ml_dir = settings.ML_MODELS_DIR
        checks["ml_models_dir"] = "exists" if os.path.isdir(ml_dir) else "missing"
    except Exception:
        checks["ml_models_dir"] = "unknown"

    # Overall status
    is_ready = checks["database"] == "connected"
    status = "ready" if is_ready else "degraded"

    return {
        "status": status,
        **checks,
    }


@router.get("/metrics", response_class=PlainTextResponse)
async def prometheus_metrics(db: AsyncSession = Depends(get_db)):
    """Exporta metricas no formato Prometheus."""
    # Update DB gauge
    try:
        result = await db.execute(text("SELECT 1"))
        metrics.set_gauge("roboroca_database_up", 1)
    except Exception:
        metrics.set_gauge("roboroca_database_up", 0)

    # Disk
    try:
        disk = shutil.disk_usage(settings.UPLOAD_DIR)
        metrics.set_gauge("roboroca_disk_free_bytes", disk.free)
        metrics.set_gauge("roboroca_disk_total_bytes", disk.total)
    except Exception:
        pass

    return metrics.export_prometheus()
