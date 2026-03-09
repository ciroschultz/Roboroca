"""
Sentinel Hub NDVI - Índice de vegetação real via satélite.
Usa Copernicus Data Space Ecosystem (CDSE) - gratuito com registro.
Fallback para ExG do Esri RGB quando credenciais não configuradas.
"""

import logging
from datetime import date, timedelta

import httpx

from backend.core.config import settings

logger = logging.getLogger(__name__)

CDSE_TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
CDSE_PROCESS_URL = "https://sh.dataspace.copernicus.eu/api/v1/statistics"


async def _get_access_token() -> str | None:
    """Obter token OAuth2 do Copernicus Data Space."""
    if not settings.SENTINEL_CLIENT_ID or not settings.SENTINEL_CLIENT_SECRET:
        return None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                CDSE_TOKEN_URL,
                data={
                    "grant_type": "client_credentials",
                    "client_id": settings.SENTINEL_CLIENT_ID,
                    "client_secret": settings.SENTINEL_CLIENT_SECRET,
                },
            )
            response.raise_for_status()
            return response.json()["access_token"]
    except (httpx.HTTPStatusError, httpx.ConnectError, httpx.TimeoutException, KeyError) as e:
        logger.warning("Sentinel token error: %s", e)
        return None


async def get_sentinel_ndvi(
    lat: float,
    lon: float,
    radius_m: float = 500,
    date_from: date | None = None,
    date_to: date | None = None,
) -> dict:
    """
    Buscar NDVI real via Sentinel-2.

    Args:
        lat: Latitude
        lon: Longitude
        radius_m: Raio em metros para o bounding box
        date_from: Data inicial (default: 30 dias atrás)
        date_to: Data final (default: hoje)

    Returns:
        Dict com ndvi_mean, ndvi_min, ndvi_max, cloud_coverage, data_source.
    """
    if date_to is None:
        date_to = date.today()
    if date_from is None:
        date_from = date_to - timedelta(days=30)

    token = await _get_access_token()
    if token is None:
        return {
            "ndvi_mean": None,
            "ndvi_min": None,
            "ndvi_max": None,
            "cloud_coverage": None,
            "data_source": "unavailable",
            "error": "Sentinel Hub não configurado. Configure SENTINEL_CLIENT_ID e SENTINEL_CLIENT_SECRET.",
        }

    # Calcular bounding box a partir do centro + raio
    # ~111km por grau de latitude, ~111*cos(lat) por grau de longitude
    import math
    lat_offset = radius_m / 111000
    lon_offset = radius_m / (111000 * math.cos(math.radians(lat)))
    bbox = [
        round(lon - lon_offset, 6),
        round(lat - lat_offset, 6),
        round(lon + lon_offset, 6),
        round(lat + lat_offset, 6),
    ]

    # Evalscript para calcular NDVI estatístico
    evalscript = """
//VERSION=3
function setup() {
    return {
        input: [{bands: ["B04", "B08", "SCL"], units: "DN"}],
        output: [{id: "ndvi", bands: 1}],
        mosaicking: "ORBIT"
    };
}

function evaluatePixel(samples) {
    // Filtrar nuvens via SCL (Scene Classification Layer)
    // SCL 4=vegetation, 5=bare soil, 6=water, 7=low clouds
    let validSamples = samples.filter(s => [4, 5, 6, 11].includes(s.SCL));
    if (validSamples.length === 0) return { ndvi: [NaN] };

    let s = validSamples[validSamples.length - 1];
    let nir = s.B08;
    let red = s.B04;
    let ndvi = (nir - red) / (nir + red + 0.0001);
    return { ndvi: [ndvi] };
}
"""

    request_body = {
        "input": {
            "bounds": {
                "bbox": bbox,
                "properties": {"crs": "http://www.opengis.net/def/crs/EPSG/0/4326"},
            },
            "data": [{
                "type": "sentinel-2-l2a",
                "dataFilter": {
                    "timeRange": {
                        "from": f"{date_from.isoformat()}T00:00:00Z",
                        "to": f"{date_to.isoformat()}T23:59:59Z",
                    },
                    "maxCloudCoverage": 30,
                },
            }],
        },
        "aggregation": {
            "timeRange": {
                "from": f"{date_from.isoformat()}T00:00:00Z",
                "to": f"{date_to.isoformat()}T23:59:59Z",
            },
            "aggregationInterval": {"of": "P1D"},
            "evalscript": evalscript,
            "resx": 10,
            "resy": 10,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                CDSE_PROCESS_URL,
                json=request_body,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()
            result = response.json()
    except (httpx.HTTPStatusError, httpx.ConnectError, httpx.TimeoutException) as e:
        logger.error("Sentinel NDVI error: %s", e)
        return {
            "ndvi_mean": None,
            "ndvi_min": None,
            "ndvi_max": None,
            "cloud_coverage": None,
            "data_source": "sentinel_error",
            "error": str(e),
        }

    # Extrair estatísticas do resultado
    data_entries = result.get("data", [])
    if not data_entries:
        return {
            "ndvi_mean": None,
            "ndvi_min": None,
            "ndvi_max": None,
            "cloud_coverage": None,
            "data_source": "sentinel_no_data",
            "error": "Sem dados Sentinel-2 disponíveis para este período/localização",
        }

    # Pegar o dado mais recente com valores válidos
    ndvi_values = []
    for entry in data_entries:
        outputs = entry.get("outputs", {})
        ndvi_output = outputs.get("ndvi", {})
        bands = ndvi_output.get("bands", {})
        b0 = bands.get("B0", {})
        stats = b0.get("stats", {})
        mean = stats.get("mean")
        if mean is not None and not (isinstance(mean, float) and (mean != mean)):  # NaN check
            ndvi_values.append({
                "mean": stats.get("mean"),
                "min": stats.get("min"),
                "max": stats.get("max"),
                "stDev": stats.get("stDev"),
                "sampleCount": stats.get("sampleCount", 0),
                "noDataCount": stats.get("noDataCount", 0),
            })

    if not ndvi_values:
        return {
            "ndvi_mean": None,
            "ndvi_min": None,
            "ndvi_max": None,
            "cloud_coverage": None,
            "data_source": "sentinel_cloudy",
            "error": "Dados Sentinel-2 cobertos por nuvens neste período",
        }

    # Usar a observação mais recente com dados válidos
    latest = ndvi_values[-1]
    total_pixels = latest["sampleCount"] + latest["noDataCount"]
    cloud_pct = round(latest["noDataCount"] / total_pixels * 100, 1) if total_pixels > 0 else None

    return {
        "ndvi_mean": round(latest["mean"], 4) if latest["mean"] is not None else None,
        "ndvi_min": round(latest["min"], 4) if latest["min"] is not None else None,
        "ndvi_max": round(latest["max"], 4) if latest["max"] is not None else None,
        "cloud_coverage": cloud_pct,
        "data_source": "sentinel",
        "observations": len(ndvi_values),
        "bbox": bbox,
        "period": {"from": date_from.isoformat(), "to": date_to.isoformat()},
    }
