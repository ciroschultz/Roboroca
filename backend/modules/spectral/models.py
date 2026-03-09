"""
Spectral Analysis models - Amostras, biblioteca, calibração.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship

from backend.core.database import Base


class SpectralSample(Base):
    """Amostra espectral de madeira."""

    __tablename__ = "spectral_samples"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    sample_code = Column(String(100), nullable=False)
    species = Column(String(100), nullable=False)  # E. urograndis, E. grandis, etc.
    technique = Column(String(20), default="raman")  # raman, ftir
    status = Column(String(20), default="pendente")  # pendente, analisada

    # Analysis results
    ratio = Column(Float, nullable=True)  # lignin_area / cellulose_area
    lignin_percent = Column(Float, nullable=True)
    cellulose_percent = Column(Float, nullable=True)

    # Spectrum data
    spectrum_file_path = Column(String(500), nullable=True)
    spectrum_data = Column(JSON, nullable=True)  # [{wavenumber, intensity}, ...]

    analyzed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<SpectralSample(id={self.id}, code='{self.sample_code}')>"


class CalibrationPoint(Base):
    """Ponto de calibração para curva ratio -> % composição."""

    __tablename__ = "calibration_points"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    technique = Column(String(20), default="raman")
    species = Column(String(100), nullable=True)
    ratio = Column(Float, nullable=False)
    lignin_reference = Column(Float, nullable=False)  # % known from wet chemistry

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class LibrarySpectrum(Base):
    """Espectro de referência na biblioteca."""

    __tablename__ = "library_spectra"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    species = Column(String(100), nullable=False)
    technique = Column(String(20), default="raman")
    ratio = Column(Float, nullable=True)
    lignin_percent = Column(Float, nullable=True)
    cellulose_percent = Column(Float, nullable=True)
    spectrum_data = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
