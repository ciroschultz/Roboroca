"""
GPS Clustering Service
Agrupamento de imagens por proximidade geográfica usando distância Haversine.
"""

import math
from typing import List, Dict, Any, Tuple


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calcular distância Haversine entre dois pontos GPS em metros.

    Args:
        lat1, lon1: Coordenadas do ponto 1
        lat2, lon2: Coordenadas do ponto 2

    Returns:
        Distância em metros
    """
    R = 6371000  # Raio da Terra em metros

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def cluster_images_by_location(
    images: List[Dict[str, Any]],
    radius_m: float = 50.0
) -> List[Dict[str, Any]]:
    """
    Agrupar imagens por proximidade geográfica.

    Usa algoritmo simples de agrupamento baseado em raio:
    para cada imagem, se está dentro do raio de um cluster existente,
    adiciona ao cluster; caso contrário, cria um novo cluster.

    Args:
        images: Lista de dicionários com pelo menos 'id', 'latitude', 'longitude'
        radius_m: Raio de agrupamento em metros (padrão: 50m)

    Returns:
        Lista de clusters, cada um com centroide e lista de image_ids
    """
    # Filtrar imagens com GPS válido
    gps_images = [
        img for img in images
        if img.get("latitude") is not None and img.get("longitude") is not None
    ]

    if not gps_images:
        return []

    clusters: List[Dict[str, Any]] = []

    for img in gps_images:
        lat = img["latitude"]
        lon = img["longitude"]
        img_id = img["id"]

        # Tentar adicionar a um cluster existente
        added = False
        for cluster in clusters:
            dist = haversine_distance(
                lat, lon,
                cluster["centroid_lat"], cluster["centroid_lon"]
            )
            if dist <= radius_m:
                # Adicionar ao cluster e recalcular centroide
                cluster["image_ids"].append(img_id)
                cluster["images"].append(img)
                n = len(cluster["image_ids"])
                cluster["centroid_lat"] = sum(
                    i["latitude"] for i in cluster["images"]
                ) / n
                cluster["centroid_lon"] = sum(
                    i["longitude"] for i in cluster["images"]
                ) / n
                added = True
                break

        if not added:
            # Criar novo cluster
            clusters.append({
                "centroid_lat": lat,
                "centroid_lon": lon,
                "image_ids": [img_id],
                "images": [img],
            })

    # Formatar resultado (remover campo intermediário 'images')
    result = []
    for i, cluster in enumerate(clusters):
        result.append({
            "cluster_id": i,
            "centroid": {
                "latitude": round(cluster["centroid_lat"], 7),
                "longitude": round(cluster["centroid_lon"], 7),
            },
            "image_count": len(cluster["image_ids"]),
            "image_ids": cluster["image_ids"],
            "radius_m": radius_m,
        })

    return result


def calculate_centroid(
    coordinates: List[Tuple[float, float]]
) -> Tuple[float, float]:
    """
    Calcular centroide de uma lista de coordenadas GPS.

    Args:
        coordinates: Lista de tuplas (latitude, longitude)

    Returns:
        Tupla (latitude_centroide, longitude_centroide)
    """
    if not coordinates:
        return (0.0, 0.0)

    avg_lat = sum(c[0] for c in coordinates) / len(coordinates)
    avg_lon = sum(c[1] for c in coordinates) / len(coordinates)

    return (round(avg_lat, 7), round(avg_lon, 7))
