"""
External API Services
Módulo de integrações com APIs externas gratuitas para enriquecer dados do projeto.
"""

from backend.services.external.weather import get_weather_data
from backend.services.external.soil import get_soil_data
from backend.services.external.elevation import get_elevation_data
from backend.services.external.geocoding import get_geocoding_data

__all__ = [
    'get_weather_data',
    'get_soil_data',
    'get_elevation_data',
    'get_geocoding_data',
]
