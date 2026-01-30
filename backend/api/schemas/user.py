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
    """Schema para atualizar usuário."""
    full_name: Optional[str] = Field(None, max_length=255)
    password: Optional[str] = Field(None, min_length=6, max_length=100)


# --- Response Schemas ---

class UserResponse(BaseModel):
    """Schema de resposta de usuário."""
    id: int
    email: str
    username: str
    full_name: Optional[str]
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
