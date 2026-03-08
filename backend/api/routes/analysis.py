"""
Analysis Routes — Alias de compatibilidade.

Todos os endpoints foram movidos para backend.modules.aerial.router.
Este modulo re-exporta o router com o prefixo original /analysis
para nao quebrar testes e URLs existentes.
"""

from fastapi import APIRouter

from backend.modules.aerial.router import router as _aerial_router

# Cria router /analysis que inclui todos os endpoints do modulo aerial.
# Assim /api/v1/analysis/* continua funcionando como antes.
router = APIRouter(prefix="/analysis", tags=["Analysis"])
router.include_router(_aerial_router)
