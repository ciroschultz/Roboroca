"""
Satellite Imagery Service
Busca imagens de satélite/mapa a partir de coordenadas GPS usando APIs gratuitas.
"""

import logging
import os
import uuid
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# Provedores disponíveis
PROVIDERS = {
    "esri": {
        "name": "Esri World Imagery",
        "url_template": (
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery"
            "/MapServer/export?bbox={west},{south},{east},{north}"
            "&bboxSR=4326&imageSR=4326&size={width},{height}"
            "&format=png&f=image"
        ),
        "attribution": "Esri, Maxar, Earthstar Geographics",
    },
    "osm": {
        "name": "OpenStreetMap Static",
        "url_template": (
            "https://staticmap.openstreetmap.de/staticmap.php"
            "?center={lat},{lon}&zoom={zoom}&size={width}x{height}&maptype=mapnik"
        ),
        "attribution": "OpenStreetMap contributors",
    },
    "google": {
        "name": "Google Maps Static",
        "url_template": (
            "https://maps.googleapis.com/maps/api/staticmap"
            "?center={lat},{lon}&zoom={zoom}&size={width}x{height}"
            "&maptype=satellite&key={api_key}"
        ),
        "attribution": "Google Maps",
        "requires_key": True,
    },
}


def _radius_to_bbox(lat: float, lon: float, radius_m: float) -> tuple:
    """Converter lat/lon + raio em bounding box (west, south, east, north)."""
    import math
    # Graus por metro (aproximação)
    lat_deg_per_m = 1.0 / 111320.0
    lon_deg_per_m = 1.0 / (111320.0 * math.cos(math.radians(lat)))

    delta_lat = radius_m * lat_deg_per_m
    delta_lon = radius_m * lon_deg_per_m

    return (
        lon - delta_lon,  # west
        lat - delta_lat,  # south
        lon + delta_lon,  # east
        lat + delta_lat,  # north
    )


def _radius_to_zoom(radius_m: float) -> int:
    """Estimar nível de zoom baseado no raio desejado."""
    if radius_m <= 100:
        return 18
    elif radius_m <= 250:
        return 17
    elif radius_m <= 500:
        return 16
    elif radius_m <= 1000:
        return 15
    elif radius_m <= 2000:
        return 14
    elif radius_m <= 5000:
        return 13
    elif radius_m <= 10000:
        return 12
    else:
        return 11


async def fetch_satellite_image(
    lat: float,
    lon: float,
    radius_m: float = 500,
    width: int = 1024,
    height: int = 1024,
    provider: str = "esri",
    upload_dir: str = "./uploads",
    api_key: Optional[str] = None,
) -> dict:
    """
    Buscar imagem de satélite a partir de coordenadas GPS.

    Args:
        lat: Latitude (WGS84)
        lon: Longitude (WGS84)
        radius_m: Raio da área em metros
        width: Largura da imagem em pixels
        height: Altura da imagem em pixels
        provider: Provedor de imagens (esri, osm, google)
        upload_dir: Diretório para salvar a imagem
        api_key: Chave da API (necessário para Google)

    Returns:
        dict com file_path, provider, bbox, metadata
    """
    if provider not in PROVIDERS:
        raise ValueError(f"Provedor '{provider}' não suportado. Use: {list(PROVIDERS.keys())}")

    config = PROVIDERS[provider]

    if config.get("requires_key") and not api_key:
        raise ValueError(f"Provedor '{provider}' requer API key")

    # Calcular bounding box e zoom
    west, south, east, north = _radius_to_bbox(lat, lon, radius_m)
    zoom = _radius_to_zoom(radius_m)

    # Montar URL
    url = config["url_template"].format(
        lat=lat,
        lon=lon,
        west=west,
        south=south,
        east=east,
        north=north,
        zoom=zoom,
        width=width,
        height=height,
        api_key=api_key or "",
    )

    logger.info(f"Fetching satellite image from {config['name']}: {lat}, {lon}, radius={radius_m}m")

    # Baixar imagem
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url)
        response.raise_for_status()

    # Verificar se recebemos uma imagem
    content_type = response.headers.get("content-type", "")
    if "image" not in content_type and "octet" not in content_type:
        raise ValueError(f"Resposta não é uma imagem: {content_type}")

    # Salvar imagem
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"satellite_{provider}_{uuid.uuid4().hex[:8]}.png"
    file_path = os.path.join(upload_dir, filename)

    with open(file_path, "wb") as f:
        f.write(response.content)

    file_size = os.path.getsize(file_path)

    # Calcular GSD aproximado (metros por pixel)
    gsd_x = (radius_m * 2) / width
    gsd_y = (radius_m * 2) / height
    gsd = (gsd_x + gsd_y) / 2

    return {
        "file_path": file_path,
        "filename": filename,
        "file_size": file_size,
        "provider": config["name"],
        "attribution": config["attribution"],
        "bbox": {
            "west": west,
            "south": south,
            "east": east,
            "north": north,
        },
        "center": {"lat": lat, "lon": lon},
        "radius_m": radius_m,
        "zoom": zoom,
        "dimensions": {"width": width, "height": height},
        "gsd_m": round(gsd, 4),
    }


def get_available_providers() -> list:
    """Listar provedores disponíveis."""
    return [
        {
            "id": key,
            "name": config["name"],
            "requires_key": config.get("requires_key", False),
            "attribution": config["attribution"],
        }
        for key, config in PROVIDERS.items()
    ]
