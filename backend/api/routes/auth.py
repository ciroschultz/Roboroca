"""
Authentication Routes
Endpoints para autenticação e gerenciamento de usuários.
"""

import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.core.database import get_db
from backend.core.config import settings
from backend.core.security import verify_password, get_password_hash, create_access_token
from backend.models.user import User
from backend.api.schemas.user import (
    UserCreate,
    UserUpdate,
    UserPreferencesUpdate,
    UserResponse,
    Token,
    PasswordChange,
    PasswordResetRequest,
    PasswordResetConfirm,
)
from backend.api.dependencies.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth")


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """Registrar novo usuário."""
    # Verificar se email já existe
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado"
        )

    # Verificar se username já existe
    result = await db.execute(select(User).where(User.username == user_data.username))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username já existe"
        )

    # Criar usuário
    user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return user


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    Autenticar usuário e retornar token JWT.

    Use o email como username no formulário.
    """
    # Buscar usuário por email
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo"
        )

    # Criar token
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return Token(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Retornar informações do usuário autenticado."""
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_me(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Atualizar dados do perfil do usuário autenticado."""
    update_fields = user_data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(current_user, field, value)

    await db.commit()
    await db.refresh(current_user)

    return current_user


@router.put("/preferences", response_model=UserResponse)
async def update_preferences(
    prefs: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Atualizar preferências do usuário (tema, idioma, notificações)."""
    update_fields = prefs.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(current_user, field, value)

    await db.commit()
    await db.refresh(current_user)

    return current_user


@router.post("/password/change")
async def change_password(
    data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Alterar senha do usuário autenticado."""
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Senha atual incorreta"
        )

    current_user.hashed_password = get_password_hash(data.new_password)
    await db.commit()

    return {"message": "Senha alterada com sucesso"}


@router.post("/password/reset-request")
async def request_password_reset(
    data: PasswordResetRequest,
    db: AsyncSession = Depends(get_db)
):
    """Solicitar reset de senha. Gera token e loga URL no console."""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    # Always return success to avoid email enumeration
    if not user:
        return {"message": "Se o email estiver cadastrado, você receberá instruções para redefinir sua senha."}

    # Generate reset token
    token = secrets.token_urlsafe(32)
    user.reset_token = token
    user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
    await db.commit()

    # Log reset URL to console (no email service)
    reset_url = f"http://localhost:3000/reset-password?token={token}"
    logger.warning("PASSWORD RESET URL for %s: %s", user.email, reset_url)

    return {"message": "Se o email estiver cadastrado, você receberá instruções para redefinir sua senha."}


@router.post("/password/reset-confirm")
async def confirm_password_reset(
    data: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db)
):
    """Confirmar reset de senha com token válido."""
    result = await db.execute(
        select(User).where(
            User.reset_token == data.token,
            User.reset_token_expires > datetime.now(timezone.utc)
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido ou expirado"
        )

    user.hashed_password = get_password_hash(data.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    await db.commit()

    return {"message": "Senha redefinida com sucesso"}
