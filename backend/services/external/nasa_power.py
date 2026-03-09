"""
NASA POWER API - Dados climáticos históricos.
API 100% gratuita, sem necessidade de API key.
https://power.larc.nasa.gov/
"""

import logging
from datetime import date, timedelta
from collections import defaultdict

import httpx

logger = logging.getLogger(__name__)

NASA_POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"

# Parâmetros climáticos disponíveis
PARAMETERS = [
    "ALLSKY_SFC_SW_DWN",  # Radiação solar (kWh/m²/dia)
    "PRECTOTCORR",        # Precipitação corrigida (mm/dia)
    "T2M",                # Temperatura média a 2m (°C)
    "T2M_MAX",            # Temperatura máxima (°C)
    "T2M_MIN",            # Temperatura mínima (°C)
    "RH2M",               # Umidade relativa a 2m (%)
]


async def get_climate_history(
    lat: float,
    lon: float,
    start_date: date,
    end_date: date,
) -> dict:
    """
    Buscar dados climáticos históricos da NASA POWER.

    Args:
        lat: Latitude
        lon: Longitude
        start_date: Data inicial
        end_date: Data final

    Returns:
        Dict com dados diários, médias mensais e fonte.
    """
    params = {
        "parameters": ",".join(PARAMETERS),
        "community": "AG",  # Agriculture
        "longitude": round(lon, 4),
        "latitude": round(lat, 4),
        "start": start_date.strftime("%Y%m%d"),
        "end": end_date.strftime("%Y%m%d"),
        "format": "JSON",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(NASA_POWER_URL, params=params)
            response.raise_for_status()
            data = response.json()
    except (httpx.HTTPStatusError, httpx.ConnectError, httpx.TimeoutException) as e:
        logger.error("NASA POWER API error: %s", e)
        return {"error": str(e), "source": "NASA POWER"}

    properties = data.get("properties", {})
    parameter_data = properties.get("parameter", {})

    if not parameter_data:
        return {"error": "Sem dados disponíveis para esta localização/período", "source": "NASA POWER"}

    # Calcular médias mensais
    monthly = defaultdict(lambda: defaultdict(list))
    for param_name, daily_values in parameter_data.items():
        for date_str, value in daily_values.items():
            if value == -999.0:  # NASA POWER missing data marker
                continue
            month_key = date_str[:6]  # YYYYMM
            monthly[month_key][param_name].append(value)

    monthly_averages = []
    for month_key in sorted(monthly.keys()):
        month_data = monthly[month_key]
        avg = {"month": f"{month_key[:4]}-{month_key[4:6]}"}
        for param in PARAMETERS:
            values = month_data.get(param, [])
            if values:
                if param == "PRECTOTCORR":
                    avg[param] = round(sum(values), 1)  # Total mensal para precipitação
                else:
                    avg[param] = round(sum(values) / len(values), 2)
        monthly_averages.append(avg)

    # Calcular totais do período
    period_stats = {}
    for param_name, daily_values in parameter_data.items():
        valid_values = [v for v in daily_values.values() if v != -999.0]
        if valid_values:
            period_stats[param_name] = {
                "mean": round(sum(valid_values) / len(valid_values), 2),
                "min": round(min(valid_values), 2),
                "max": round(max(valid_values), 2),
                "total": round(sum(valid_values), 1) if param_name == "PRECTOTCORR" else None,
            }

    return {
        "source": "NASA POWER",
        "coordinates": {"latitude": lat, "longitude": lon},
        "period": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat(),
        },
        "monthly_averages": monthly_averages,
        "period_stats": period_stats,
        "parameters_description": {
            "ALLSKY_SFC_SW_DWN": {"label": "Radiação Solar", "unit": "kWh/m²/dia"},
            "PRECTOTCORR": {"label": "Precipitação", "unit": "mm/dia (total mensal em monthly)"},
            "T2M": {"label": "Temperatura Média", "unit": "°C"},
            "T2M_MAX": {"label": "Temperatura Máxima", "unit": "°C"},
            "T2M_MIN": {"label": "Temperatura Mínima", "unit": "°C"},
            "RH2M": {"label": "Umidade Relativa", "unit": "%"},
        },
    }
