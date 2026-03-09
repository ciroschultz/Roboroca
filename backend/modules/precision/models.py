"""
Precision Agriculture models - Talhões, snapshots, zonas de manejo, prescrições.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON, Date
from sqlalchemy.orm import relationship

from backend.core.database import Base


class Field(Base):
    """Talhão agrícola."""

    __tablename__ = "fields"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    area_ha = Column(Float, nullable=True)
    crop = Column(String(100), nullable=True)  # Soja, Milho, Café, etc.
    status = Column(String(50), default="ativo")  # ativo, colhido, pousio
    geometry = Column(JSON, nullable=True)  # GeoJSON polygon
    center_lat = Column(Float, nullable=True)
    center_lon = Column(Float, nullable=True)
    planting_date = Column(Date, nullable=True)
    expected_harvest = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    snapshots = relationship("FieldSnapshot", back_populates="field", cascade="all, delete-orphan")
    zones = relationship("ManagementZone", back_populates="field", cascade="all, delete-orphan")
    prescriptions = relationship("Prescription", back_populates="field", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Field(id={self.id}, name='{self.name}')>"


class FieldSnapshot(Base):
    """Snapshot temporal de dados do talhão (vegetação, clima, solo)."""

    __tablename__ = "field_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id", ondelete="CASCADE"), nullable=False, index=True)
    snapshot_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Vegetation index (ExG from RGB)
    vegetation_index_mean = Column(Float, nullable=True)
    vegetation_index_min = Column(Float, nullable=True)
    vegetation_index_max = Column(Float, nullable=True)

    # External API data
    weather_data = Column(JSON, nullable=True)
    soil_data = Column(JSON, nullable=True)
    satellite_image_path = Column(String(500), nullable=True)
    ndvi_source = Column(String(50), nullable=True)  # "sentinel" or "exg"

    field = relationship("Field", back_populates="snapshots")

    def __repr__(self):
        return f"<FieldSnapshot(id={self.id}, field_id={self.field_id})>"


class ManagementZone(Base):
    """Zona de manejo gerada a partir de índice de vegetação."""

    __tablename__ = "management_zones"

    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id", ondelete="CASCADE"), nullable=False, index=True)
    zone_type = Column(String(50), nullable=False)  # alta, media, baixa, recuperacao
    geometry = Column(JSON, nullable=True)  # GeoJSON
    area_ha = Column(Float, nullable=True)
    ndvi_range = Column(JSON, nullable=True)  # {"min": 0.6, "max": 0.8}

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    field = relationship("Field", back_populates="zones")


class Prescription(Base):
    """Prescrição de aplicação de insumos."""

    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(100), nullable=False)  # fertilizante, herbicida, fungicida, inseticida
    product_name = Column(String(255), nullable=False)
    rate_per_ha = Column(Float, nullable=True)
    total_quantity = Column(Float, nullable=True)
    status = Column(String(50), default="pendente")  # pendente, aplicado, cancelado
    zone_id = Column(Integer, ForeignKey("management_zones.id", ondelete="SET NULL"), nullable=True)
    applied_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    field = relationship("Field", back_populates="prescriptions")


class ActivityLog(Base):
    """Log de atividades do módulo de precisão."""

    __tablename__ = "precision_activity_log"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    field_id = Column(Integer, ForeignKey("fields.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(255), nullable=False)
    activity_type = Column(String(50), nullable=False)  # snapshot, prescription, field, zone

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
