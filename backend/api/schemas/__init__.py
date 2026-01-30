"""
Pydantic schemas for request/response validation.
"""

from backend.api.schemas.user import (
    UserCreate,
    UserLogin,
    UserUpdate,
    UserResponse,
    Token,
    TokenData,
)
from backend.api.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectListResponse,
)
from backend.api.schemas.image import (
    ImageCreate,
    ImageUpdate,
    ImageResponse,
    ImageListResponse,
    ImageMetadata,
    UploadResponse,
)
from backend.api.schemas.analysis import (
    AnalysisRequest,
    NDVIRequest,
    ClassificationRequest,
    AnalysisResponse,
    AnalysisListResponse,
    NDVIResult,
    ClassificationResult,
    ReportData,
)

__all__ = [
    # User
    "UserCreate",
    "UserLogin",
    "UserUpdate",
    "UserResponse",
    "Token",
    "TokenData",
    # Project
    "ProjectCreate",
    "ProjectUpdate",
    "ProjectResponse",
    "ProjectListResponse",
    # Image
    "ImageCreate",
    "ImageUpdate",
    "ImageResponse",
    "ImageListResponse",
    "ImageMetadata",
    "UploadResponse",
    # Analysis
    "AnalysisRequest",
    "NDVIRequest",
    "ClassificationRequest",
    "AnalysisResponse",
    "AnalysisListResponse",
    "NDVIResult",
    "ClassificationResult",
    "ReportData",
]
