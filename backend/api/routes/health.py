"""
Health Check Routes
Endpoints para verificar a saúde da API.
"""

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from backend.core.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health")
async def health_check():
    """Verifica se a API está funcionando."""
    return {
        "status": "healthy",
        "service": "roboroca-api",
    }


@router.get("/health/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """Verifica se a API está pronta para receber requisições."""
    db_status = "connected"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        logger.error("Database health check failed: %s", e)
        db_status = "disconnected"

    status = "ready" if db_status == "connected" else "degraded"

    return {
        "status": status,
        "database": db_status,
    }
