"""
Database models.
Importar todos os modelos aqui para facilitar o uso.
"""

from backend.models.user import User
from backend.models.project import Project
from backend.models.image import Image
from backend.models.analysis import Analysis
from backend.models.annotation import Annotation

__all__ = ["User", "Project", "Image", "Analysis", "Annotation"]
