"""
Soil Service - SoilGrids/ISRIC API
Busca propriedades do solo por coordenadas GPS. Sem necessidade de API key.
Limite: 5 chamadas/minuto.
"""

import httpx
from typing import Dict, Any


SOILGRIDS_URL = "https://rest.isric.org/soilgrids/v2.0/properties/query"


async def get_soil_data(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Buscar propriedades do solo pela coordenada GPS.

    Propriedades disponíveis: pH, carbono orgânico, argila, areia, silte, nitrogênio.

    Args:
        latitude: Latitude do local
        longitude: Longitude do local

    Returns:
        Dicionário com dados do solo
    """
    params = {
        "lon": longitude,
        "lat": latitude,
        "property": [
            "phh2o",   # pH em água
            "soc",     # Carbono orgânico do solo (g/kg)
            "clay",    # Argila (g/kg)
            "sand",    # Areia (g/kg)
            "silt",    # Silte (g/kg)
            "nitrogen", # Nitrogênio total (g/kg)
            "cec",     # Capacidade de troca catiônica (cmol/kg)
            "bdod",    # Densidade aparente (kg/dm³)
        ],
        "depth": ["0-5cm", "5-15cm", "15-30cm"],
        "value": "mean",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(SOILGRIDS_URL, params=params)
            response.raise_for_status()
            data = response.json()

        properties = data.get("properties", {})
        layers = properties.get("layers", [])

        result = {
            "source": "SoilGrids/ISRIC",
            "coordinates": {"latitude": latitude, "longitude": longitude},
            "properties": {},
        }

        property_labels = {
            "phh2o": {"name": "pH (H2O)", "unit": "pH", "divisor": 10},
            "soc": {"name": "Carbono orgânico", "unit": "g/kg", "divisor": 10},
            "clay": {"name": "Argila", "unit": "g/kg", "divisor": 10},
            "sand": {"name": "Areia", "unit": "g/kg", "divisor": 10},
            "silt": {"name": "Silte", "unit": "g/kg", "divisor": 10},
            "nitrogen": {"name": "Nitrogênio total", "unit": "g/kg", "divisor": 100},
            "cec": {"name": "CTC", "unit": "cmol(c)/kg", "divisor": 10},
            "bdod": {"name": "Densidade aparente", "unit": "kg/dm³", "divisor": 100},
        }

        for layer in layers:
            prop_name = layer.get("name", "")
            depths = layer.get("depths", [])

            label_info = property_labels.get(prop_name, {
                "name": prop_name, "unit": "", "divisor": 1
            })

            depth_values = {}
            for depth_entry in depths:
                depth_label = depth_entry.get("label", "")
                values = depth_entry.get("values", {})
                mean_val = values.get("mean")

                if mean_val is not None:
                    depth_values[depth_label] = round(
                        mean_val / label_info["divisor"], 2
                    )

            if depth_values:
                result["properties"][prop_name] = {
                    "label": label_info["name"],
                    "unit": label_info["unit"],
                    "depths": depth_values,
                }

        # Gerar resumo com interpretação
        result["interpretation"] = _interpret_soil(result["properties"])

        return result

    except httpx.HTTPStatusError as e:
        return {"error": f"HTTP {e.response.status_code}", "source": "SoilGrids/ISRIC"}
    except httpx.RequestError as e:
        return {"error": f"Erro de conexão: {e}", "source": "SoilGrids/ISRIC"}
    except Exception as e:
        return {"error": str(e), "source": "SoilGrids/ISRIC"}


def _interpret_soil(properties: Dict[str, Any]) -> Dict[str, str]:
    """Gerar interpretação simplificada dos dados do solo."""
    interpretation = {}

    # pH
    ph_data = properties.get("phh2o", {}).get("depths", {})
    if ph_data:
        ph_surface = list(ph_data.values())[0] if ph_data else None
        if ph_surface is not None:
            if ph_surface < 4.5:
                interpretation["ph"] = "Solo extremamente ácido"
            elif ph_surface < 5.5:
                interpretation["ph"] = "Solo fortemente ácido"
            elif ph_surface < 6.0:
                interpretation["ph"] = "Solo moderadamente ácido"
            elif ph_surface < 6.5:
                interpretation["ph"] = "Solo levemente ácido"
            elif ph_surface < 7.5:
                interpretation["ph"] = "Solo neutro"
            elif ph_surface < 8.0:
                interpretation["ph"] = "Solo levemente alcalino"
            else:
                interpretation["ph"] = "Solo alcalino"

    # Carbono orgânico
    soc_data = properties.get("soc", {}).get("depths", {})
    if soc_data:
        soc_surface = list(soc_data.values())[0] if soc_data else None
        if soc_surface is not None:
            if soc_surface < 10:
                interpretation["materia_organica"] = "Baixo teor de matéria orgânica"
            elif soc_surface < 20:
                interpretation["materia_organica"] = "Teor médio de matéria orgânica"
            else:
                interpretation["materia_organica"] = "Alto teor de matéria orgânica"

    # Textura (argila/areia/silte)
    clay_data = properties.get("clay", {}).get("depths", {})
    sand_data = properties.get("sand", {}).get("depths", {})
    if clay_data and sand_data:
        clay = list(clay_data.values())[0] if clay_data else 0
        sand = list(sand_data.values())[0] if sand_data else 0
        if clay > 400:
            interpretation["textura"] = "Solo argiloso (retenção alta de água)"
        elif sand > 600:
            interpretation["textura"] = "Solo arenoso (drenagem rápida)"
        else:
            interpretation["textura"] = "Solo de textura média (franco)"

    return interpretation
