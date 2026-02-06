"""
Geocoding Service - Nominatim/OpenStreetMap API
Geocodificação reversa: converte coordenadas GPS em endereço legível.
Sem necessidade de API key.
Limite: 1 chamada/segundo.
"""

import httpx
from typing import Dict, Any


NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"


async def get_geocoding_data(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Converter coordenadas GPS em endereço legível (geocodificação reversa).

    Args:
        latitude: Latitude do local
        longitude: Longitude do local

    Returns:
        Dicionário com dados de endereço
    """
    params = {
        "lat": latitude,
        "lon": longitude,
        "format": "json",
        "addressdetails": 1,
        "zoom": 14,
        "accept-language": "pt-BR",
    }

    headers = {
        "User-Agent": "Roboroca/1.0 (Agricultural Analysis Platform)",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                NOMINATIM_URL, params=params, headers=headers
            )
            response.raise_for_status()
            data = response.json()

        address = data.get("address", {})

        result = {
            "source": "Nominatim/OpenStreetMap",
            "coordinates": {"latitude": latitude, "longitude": longitude},
            "display_name": data.get("display_name", ""),
            "address": {
                "road": address.get("road"),
                "suburb": address.get("suburb"),
                "city": (
                    address.get("city")
                    or address.get("town")
                    or address.get("village")
                    or address.get("municipality")
                ),
                "county": address.get("county"),
                "state": address.get("state"),
                "state_district": address.get("state_district"),
                "postcode": address.get("postcode"),
                "country": address.get("country"),
                "country_code": address.get("country_code"),
            },
            "osm_type": data.get("osm_type"),
            "osm_id": data.get("osm_id"),
        }

        # Limpar campos None
        result["address"] = {
            k: v for k, v in result["address"].items() if v is not None
        }

        return result

    except httpx.HTTPStatusError as e:
        return {"error": f"HTTP {e.response.status_code}", "source": "Nominatim/OpenStreetMap"}
    except httpx.RequestError as e:
        return {"error": f"Erro de conexão: {e}", "source": "Nominatim/OpenStreetMap"}
    except Exception as e:
        return {"error": str(e), "source": "Nominatim/OpenStreetMap"}
