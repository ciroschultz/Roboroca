"""
Database models.
Importar todos os modelos aqui para facilitar o uso.
"""

from backend.models.user import User
from backend.models.project import Project
from backend.models.image import Image
from backend.models.analysis import Analysis
from backend.models.annotation import Annotation
from backend.models.api_key import ApiKey

from backend.modules.calculator.models import Calculation
from backend.modules.equipment.models import Product, CartItem, Favorite, Order, OrderItem, OrderStatusHistory
from backend.modules.precision.models import Field, FieldSnapshot, ManagementZone, Prescription, ActivityLog
from backend.modules.spectral.models import SpectralSample, CalibrationPoint, LibrarySpectrum

__all__ = [
    "User", "Project", "Image", "Analysis", "Annotation", "ApiKey",
    "Calculation",
    "Product", "CartItem", "Favorite", "Order", "OrderItem", "OrderStatusHistory",
    "Field", "FieldSnapshot", "ManagementZone", "Prescription", "ActivityLog",
    "SpectralSample", "CalibrationPoint", "LibrarySpectrum",
]
