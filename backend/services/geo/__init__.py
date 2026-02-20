"""
Geo Services
Módulo de geoprocessamento: agrupamento GPS, cálculos de distância, UTM, etc.
"""

from backend.services.geo.clustering import cluster_images_by_location, haversine_distance
from backend.services.geo.utm_converter import latlon_to_utm, get_image_utm_corners

__all__ = [
    'cluster_images_by_location',
    'haversine_distance',
    'latlon_to_utm',
    'get_image_utm_corners',
]
