"""
Elevation Service - Open Topo Data API
Busca elevação/altitude por coordenadas GPS. Sem necessidade de API key.
Limite: 1.000 chamadas/dia.
"""

import httpx
from typing import Dict, Any


OPEN_TOPO_DATA_URL = "https://api.opentopodata.org/v1/srtm30m"


async def get_elevation_data(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Buscar elevação/altitude pela coordenada GPS.

    Usa dados SRTM com resolução de 30m.

    Args:
        latitude: Latitude do local
        longitude: Longitude do local

    Returns:
        Dicionário com dados de elevação
    """
    params = {
        "locations": f"{latitude},{longitude}",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(OPEN_TOPO_DATA_URL, params=params)
            response.raise_for_status()
            data = response.json()

        results = data.get("results", [])

        if not results:
            return {
                "source": "Open Topo Data (SRTM30m)",
                "coordinates": {"latitude": latitude, "longitude": longitude},
                "error": "Sem dados de elevação para esta localização",
            }

        elevation = results[0].get("elevation")
        dataset = results[0].get("dataset", "srtm30m")

        result = {
            "source": "Open Topo Data (SRTM30m)",
            "coordinates": {"latitude": latitude, "longitude": longitude},
            "elevation_m": elevation,
            "dataset": dataset,
            "resolution_m": 30,
        }

        # Adicionar classificação de relevo
        if elevation is not None:
            result["terrain_classification"] = _classify_terrain(elevation)

        return result

    except httpx.HTTPStatusError as e:
        return {"error": f"HTTP {e.response.status_code}", "source": "Open Topo Data"}
    except httpx.RequestError as e:
        return {"error": f"Erro de conexão: {e}", "source": "Open Topo Data"}
    except Exception as e:
        return {"error": str(e), "source": "Open Topo Data"}


def _classify_terrain(elevation_m: float) -> Dict[str, str]:
    """Classificar terreno pela elevação."""
    if elevation_m < 0:
        category = "abaixo_nivel_mar"
        description = "Abaixo do nível do mar"
    elif elevation_m < 200:
        category = "planicie"
        description = "Planície (baixa altitude)"
    elif elevation_m < 500:
        category = "colina"
        description = "Colinas (altitude moderada)"
    elif elevation_m < 1000:
        category = "planalto"
        description = "Planalto"
    elif elevation_m < 2000:
        category = "montanha"
        description = "Montanha"
    else:
        category = "alta_montanha"
        description = "Alta montanha"

    return {
        "category": category,
        "description": description,
        "elevation_m": elevation_m,
    }
