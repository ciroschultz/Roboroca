"""
API Keys Routes - CRUD para chaves de API.
"""

from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.core.api_keys import generate_api_key, hash_api_key
from backend.models.api_key import ApiKey
from backend.models.user import User
from backend.api.dependencies.auth import get_current_user

router = APIRouter(prefix="/api-keys")


class ApiKeyCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    scopes: List[str] = Field(default=["aerial:read"])
    environment: str = Field(default="live", pattern="^(live|test)$")
    rate_limit_per_hour: int = Field(default=100, ge=1, le=10000)
    expires_at: Optional[datetime] = None


class ApiKeyResponse(BaseModel):
    id: int
    prefix: str
    name: str
    scopes: List[str]
    rate_limit_per_hour: int
    is_active: bool
    last_used_at: Optional[datetime]
    expires_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class ApiKeyCreateResponse(ApiKeyResponse):
    raw_key: str  # So retornado na criacao


@router.post("/", response_model=ApiKeyCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    body: ApiKeyCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Criar nova API key. A chave completa so e exibida uma vez."""
    raw_key, key_hash, prefix = generate_api_key(body.environment)

    api_key = ApiKey(
        key_hash=key_hash,
        prefix=prefix,
        name=body.name,
        user_id=current_user.id,
        scopes=body.scopes,
        rate_limit_per_hour=body.rate_limit_per_hour,
        expires_at=body.expires_at,
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)

    return ApiKeyCreateResponse(
        id=api_key.id,
        prefix=api_key.prefix,
        name=api_key.name,
        scopes=api_key.scopes or [],
        rate_limit_per_hour=api_key.rate_limit_per_hour,
        is_active=api_key.is_active,
        last_used_at=api_key.last_used_at,
        expires_at=api_key.expires_at,
        created_at=api_key.created_at,
        raw_key=raw_key,
    )


@router.get("/", response_model=List[ApiKeyResponse])
async def list_api_keys(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Listar todas as API keys do usuario."""
    result = await db.execute(
        select(ApiKey)
        .where(ApiKey.user_id == current_user.id)
        .order_by(ApiKey.created_at.desc())
    )
    keys = result.scalars().all()
    return keys


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    key_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revogar (deletar) uma API key."""
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.id == key_id,
            ApiKey.user_id == current_user.id,
        )
    )
    api_key = result.scalar_one_or_none()

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key nao encontrada",
        )

    await db.delete(api_key)
    await db.commit()
