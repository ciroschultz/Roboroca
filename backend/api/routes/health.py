"""
Health Check Routes
Endpoints para verificar a saúde da API.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    """Verifica se a API está funcionando."""
    return {
        "status": "healthy",
        "service": "roboroca-api",
    }


@router.get("/health/ready")
async def readiness_check():
    """Verifica se a API está pronta para receber requisições."""
    # TODO: Adicionar verificações de banco de dados e Redis
    return {
        "status": "ready",
        "database": "connected",
        "redis": "connected",
    }
