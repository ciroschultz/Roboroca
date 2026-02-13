"""
User schemas - Validação de dados de usuário.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


# --- Request Schemas ---

class UserCreate(BaseModel):
    """Schema para criar usuário."""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=6, max_length=100)
    full_name: Optional[str] = Field(None, max_length=255)


class UserLogin(BaseModel):
    """Schema para login."""
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    """Schema para atualizar perfil do usuário."""
    full_name: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    bio: Optional[str] = Field(None, max_length=1000)
    company: Optional[str] = Field(None, max_length=255)


class UserPreferencesUpdate(BaseModel):
    """Schema para atualizar preferências do usuário."""
    language: Optional[str] = Field(None, max_length=10)
    theme: Optional[str] = Field(None, max_length=20)
    email_notifications: Optional[bool] = None
    push_notifications: Optional[bool] = None
    weekly_report: Optional[bool] = None


class PasswordChange(BaseModel):
    """Schema para alterar senha."""
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6, max_length=100)


class PasswordResetRequest(BaseModel):
    """Schema para solicitar reset de senha."""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Schema para confirmar reset de senha."""
    token: str
    new_password: str = Field(..., min_length=6, max_length=100)


# --- Response Schemas ---

class UserResponse(BaseModel):
    """Schema de resposta de usuário."""
    id: int
    email: str
    username: str
    full_name: Optional[str]
    phone: Optional[str] = None
    bio: Optional[str] = None
    company: Optional[str] = None
    language: Optional[str] = None
    theme: Optional[str] = None
    email_notifications: Optional[bool] = None
    push_notifications: Optional[bool] = None
    weekly_report: Optional[bool] = None
    is_active: bool
    plan: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserInDB(UserResponse):
    """Schema de usuário com dados internos."""
    hashed_password: str


# --- Token Schemas ---

class Token(BaseModel):
    """Schema de token JWT."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Dados extraídos do token."""
    user_id: Optional[int] = None
    email: Optional[str] = None
