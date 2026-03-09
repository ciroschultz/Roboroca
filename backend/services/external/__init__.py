"""
External API Services
Módulo de integrações com APIs externas gratuitas para enriquecer dados do projeto.
"""

from backend.services.external.weather import get_weather_data
from backend.services.external.soil import get_soil_data
from backend.services.external.elevation import get_elevation_data
from backend.services.external.geocoding import get_geocoding_data
from backend.services.external.nasa_power import get_climate_history
from backend.services.external.sentinel_ndvi import get_sentinel_ndvi

__all__ = [
    'get_weather_data',
    'get_soil_data',
    'get_elevation_data',
    'get_geocoding_data',
    'get_climate_history',
    'get_sentinel_ndvi',
]
