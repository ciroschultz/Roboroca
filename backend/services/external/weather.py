"""
Weather Service - Open-Meteo API
Busca dados climáticos por coordenadas GPS. Sem necessidade de API key.
Limite: 10.000 chamadas/dia.
"""

import httpx
from typing import Dict, Any, Optional


OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


async def get_weather_data(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Buscar dados climáticos atuais e previsão pela coordenada GPS.

    Args:
        latitude: Latitude do local
        longitude: Longitude do local

    Returns:
        Dicionário com dados climáticos
    """
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": ",".join([
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "precipitation",
            "rain",
            "wind_speed_10m",
            "wind_direction_10m",
            "weather_code",
        ]),
        "daily": ",".join([
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_sum",
            "rain_sum",
            "wind_speed_10m_max",
            "uv_index_max",
        ]),
        "timezone": "auto",
        "forecast_days": 7,
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(OPEN_METEO_URL, params=params)
            response.raise_for_status()
            data = response.json()

        current = data.get("current", {})
        daily = data.get("daily", {})

        # Mapear weather_code para descrição
        weather_desc = _weather_code_to_description(current.get("weather_code", 0))

        result = {
            "source": "Open-Meteo",
            "coordinates": {"latitude": latitude, "longitude": longitude},
            "timezone": data.get("timezone", ""),
            "current": {
                "temperature_c": current.get("temperature_2m"),
                "apparent_temperature_c": current.get("apparent_temperature"),
                "relative_humidity_pct": current.get("relative_humidity_2m"),
                "precipitation_mm": current.get("precipitation"),
                "rain_mm": current.get("rain"),
                "wind_speed_kmh": current.get("wind_speed_10m"),
                "wind_direction_deg": current.get("wind_direction_10m"),
                "weather_description": weather_desc,
            },
            "forecast_7d": {
                "dates": daily.get("time", []),
                "temperature_max_c": daily.get("temperature_2m_max", []),
                "temperature_min_c": daily.get("temperature_2m_min", []),
                "precipitation_sum_mm": daily.get("precipitation_sum", []),
                "rain_sum_mm": daily.get("rain_sum", []),
                "wind_speed_max_kmh": daily.get("wind_speed_10m_max", []),
                "uv_index_max": daily.get("uv_index_max", []),
            },
        }

        return result

    except httpx.HTTPStatusError as e:
        return {"error": f"HTTP {e.response.status_code}", "source": "Open-Meteo"}
    except httpx.RequestError as e:
        return {"error": f"Erro de conexão: {e}", "source": "Open-Meteo"}
    except Exception as e:
        return {"error": str(e), "source": "Open-Meteo"}


def _weather_code_to_description(code: int) -> str:
    """Converter código WMO para descrição em português."""
    codes = {
        0: "Céu limpo",
        1: "Principalmente limpo",
        2: "Parcialmente nublado",
        3: "Nublado",
        45: "Neblina",
        48: "Neblina com geada",
        51: "Garoa leve",
        53: "Garoa moderada",
        55: "Garoa intensa",
        56: "Garoa gelada leve",
        57: "Garoa gelada intensa",
        61: "Chuva leve",
        63: "Chuva moderada",
        65: "Chuva intensa",
        66: "Chuva gelada leve",
        67: "Chuva gelada intensa",
        71: "Neve leve",
        73: "Neve moderada",
        75: "Neve intensa",
        77: "Grãos de neve",
        80: "Pancadas de chuva leves",
        81: "Pancadas de chuva moderadas",
        82: "Pancadas de chuva intensas",
        85: "Pancadas de neve leves",
        86: "Pancadas de neve intensas",
        95: "Tempestade",
        96: "Tempestade com granizo leve",
        99: "Tempestade com granizo intenso",
    }
    return codes.get(code, f"Código {code}")
