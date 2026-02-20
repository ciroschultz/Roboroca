"""
UTM Converter
Conversão de coordenadas Lat/Lon para UTM usando fórmulas da Transversa de Mercator.
Sem dependências externas (pura matemática).
"""

import math


def latlon_to_utm(lat: float, lon: float) -> dict:
    """
    Converte coordenadas geográficas (WGS84) para UTM.

    Returns:
        dict com zone, hemisphere, easting, northing
    """
    # Constantes WGS84
    a = 6378137.0  # semi-eixo maior
    f = 1 / 298.257223563  # achatamento
    e2 = 2 * f - f * f  # excentricidade²
    e_prime2 = e2 / (1 - e2)
    k0 = 0.9996  # fator de escala

    # Zona UTM
    zone_number = int((lon + 180) / 6) + 1
    # Meridiano central da zona
    lon0 = (zone_number - 1) * 6 - 180 + 3

    hemisphere = "N" if lat >= 0 else "S"

    lat_rad = math.radians(lat)
    lon_rad = math.radians(lon)
    lon0_rad = math.radians(lon0)

    sin_lat = math.sin(lat_rad)
    cos_lat = math.cos(lat_rad)
    tan_lat = math.tan(lat_rad)

    N = a / math.sqrt(1 - e2 * sin_lat ** 2)
    T = tan_lat ** 2
    C = e_prime2 * cos_lat ** 2
    A = cos_lat * (lon_rad - lon0_rad)

    # Comprimento do arco de meridiano
    M = a * (
        (1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256) * lat_rad
        - (3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024) * math.sin(2 * lat_rad)
        + (15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024) * math.sin(4 * lat_rad)
        - (35 * e2 ** 3 / 3072) * math.sin(6 * lat_rad)
    )

    easting = k0 * N * (
        A
        + (1 - T + C) * A ** 3 / 6
        + (5 - 18 * T + T ** 2 + 72 * C - 58 * e_prime2) * A ** 5 / 120
    ) + 500000.0

    northing = k0 * (
        M
        + N * tan_lat * (
            A ** 2 / 2
            + (5 - T + 9 * C + 4 * C ** 2) * A ** 4 / 24
            + (61 - 58 * T + T ** 2 + 600 * C - 330 * e_prime2) * A ** 6 / 720
        )
    )

    if lat < 0:
        northing += 10000000.0  # offset para hemisfério sul

    return {
        "zone": f"{zone_number}{hemisphere}",
        "zone_number": zone_number,
        "hemisphere": hemisphere,
        "easting": round(easting, 2),
        "northing": round(northing, 2),
    }


def get_image_utm_corners(
    center_lat: float,
    center_lon: float,
    width: int,
    height: int,
    gsd_m: float,
) -> dict:
    """
    Calcula UTM dos 4 cantos de uma imagem a partir do centro GPS + GSD.

    Args:
        center_lat: Latitude do centro da imagem.
        center_lon: Longitude do centro da imagem.
        width: Largura da imagem em pixels.
        height: Altura da imagem em pixels.
        gsd_m: Ground Sample Distance em metros/pixel.

    Returns:
        dict com center, top_left, top_right, bottom_left, bottom_right (todos em UTM).
    """
    center_utm = latlon_to_utm(center_lat, center_lon)

    half_w = (width / 2) * gsd_m
    half_h = (height / 2) * gsd_m

    cx = center_utm["easting"]
    cy = center_utm["northing"]

    return {
        "center": {"easting": cx, "northing": cy},
        "top_left": {"easting": round(cx - half_w, 2), "northing": round(cy + half_h, 2)},
        "top_right": {"easting": round(cx + half_w, 2), "northing": round(cy + half_h, 2)},
        "bottom_left": {"easting": round(cx - half_w, 2), "northing": round(cy - half_h, 2)},
        "bottom_right": {"easting": round(cx + half_w, 2), "northing": round(cy - half_h, 2)},
    }
