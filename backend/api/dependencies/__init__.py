"""
FastAPI dependencies (auth, database, etc).
"""

from backend.api.dependencies.auth import (
    get_current_user,
    get_current_active_user,
    get_current_superuser,
    get_optional_current_user,
)

__all__ = [
    "get_current_user",
    "get_current_active_user",
    "get_current_superuser",
    "get_optional_current_user",
]
