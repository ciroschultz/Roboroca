"""
Image Reader Service
Leitura de imagens e extração de metadados (GPS, dimensões, câmera).
"""

import os
from typing import Optional, Tuple, Dict, Any
from datetime import datetime
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import exifread


def read_image(file_path: str) -> Image.Image:
    """
    Ler imagem do disco.

    Args:
        file_path: Caminho para o arquivo de imagem

    Returns:
        Objeto PIL Image
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Arquivo não encontrado: {file_path}")

    return Image.open(file_path)


def get_image_dimensions(file_path: str) -> Tuple[int, int]:
    """
    Obter dimensões da imagem (largura, altura).

    Args:
        file_path: Caminho para o arquivo de imagem

    Returns:
        Tupla (width, height)
    """
    with Image.open(file_path) as img:
        return img.size


def _convert_to_degrees(value) -> float:
    """
    Converter coordenadas GPS de graus/minutos/segundos para decimal.
    """
    d = float(value.values[0].num) / float(value.values[0].den)
    m = float(value.values[1].num) / float(value.values[1].den)
    s = float(value.values[2].num) / float(value.values[2].den)
    return d + (m / 60.0) + (s / 3600.0)


def extract_gps_coordinates(file_path: str) -> Optional[Tuple[float, float]]:
    """
    Extrair coordenadas GPS dos metadados EXIF da imagem.
    Funciona com imagens de drone DJI e câmeras com GPS.

    Args:
        file_path: Caminho para o arquivo de imagem

    Returns:
        Tupla (latitude, longitude) ou None se não houver GPS
    """
    try:
        with open(file_path, 'rb') as f:
            tags = exifread.process_file(f, details=False)

        # Verificar se há dados GPS
        if 'GPS GPSLatitude' not in tags or 'GPS GPSLongitude' not in tags:
            return None

        lat = _convert_to_degrees(tags['GPS GPSLatitude'])
        lon = _convert_to_degrees(tags['GPS GPSLongitude'])

        # Ajustar hemisfério
        if 'GPS GPSLatitudeRef' in tags:
            if tags['GPS GPSLatitudeRef'].values[0] == 'S':
                lat = -lat

        if 'GPS GPSLongitudeRef' in tags:
            if tags['GPS GPSLongitudeRef'].values[0] == 'W':
                lon = -lon

        return (lat, lon)

    except Exception:
        return None


def extract_gps_altitude(file_path: str) -> Optional[float]:
    """
    Extrair altitude GPS dos metadados EXIF.

    Args:
        file_path: Caminho para o arquivo de imagem

    Returns:
        Altitude em metros ou None
    """
    try:
        with open(file_path, 'rb') as f:
            tags = exifread.process_file(f, details=False)

        if 'GPS GPSAltitude' not in tags:
            return None

        alt = tags['GPS GPSAltitude'].values[0]
        altitude = float(alt.num) / float(alt.den)

        # Verificar se está abaixo do nível do mar
        if 'GPS GPSAltitudeRef' in tags:
            if tags['GPS GPSAltitudeRef'].values[0] == 1:
                altitude = -altitude

        return altitude

    except Exception:
        return None


def read_metadata(file_path: str) -> Dict[str, Any]:
    """
    Ler todos os metadados relevantes da imagem.

    Args:
        file_path: Caminho para o arquivo de imagem

    Returns:
        Dicionário com metadados
    """
    metadata = {
        'filename': os.path.basename(file_path),
        'file_size': os.path.getsize(file_path),
        'width': None,
        'height': None,
        'gps_latitude': None,
        'gps_longitude': None,
        'gps_altitude': None,
        'capture_date': None,
        'camera_make': None,
        'camera_model': None,
        'focal_length': None,
        'exposure_time': None,
        'iso': None,
        'drone_info': None,
    }

    # Dimensões
    try:
        with Image.open(file_path) as img:
            metadata['width'], metadata['height'] = img.size
    except Exception:
        pass

    # GPS
    gps = extract_gps_coordinates(file_path)
    if gps:
        metadata['gps_latitude'], metadata['gps_longitude'] = gps

    metadata['gps_altitude'] = extract_gps_altitude(file_path)

    # EXIF detalhado
    try:
        with open(file_path, 'rb') as f:
            tags = exifread.process_file(f, details=False)

        # Data de captura
        if 'EXIF DateTimeOriginal' in tags:
            date_str = str(tags['EXIF DateTimeOriginal'])
            try:
                metadata['capture_date'] = datetime.strptime(date_str, '%Y:%m:%d %H:%M:%S')
            except ValueError:
                pass

        # Câmera
        if 'Image Make' in tags:
            metadata['camera_make'] = str(tags['Image Make']).strip()

        if 'Image Model' in tags:
            metadata['camera_model'] = str(tags['Image Model']).strip()

        # Parâmetros de captura
        if 'EXIF FocalLength' in tags:
            fl = tags['EXIF FocalLength'].values[0]
            metadata['focal_length'] = float(fl.num) / float(fl.den)

        if 'EXIF ExposureTime' in tags:
            et = tags['EXIF ExposureTime'].values[0]
            metadata['exposure_time'] = f"{et.num}/{et.den}"

        if 'EXIF ISOSpeedRatings' in tags:
            metadata['iso'] = int(str(tags['EXIF ISOSpeedRatings']))

        # Detectar se é drone DJI
        make = metadata.get('camera_make', '').upper()
        if 'DJI' in make:
            metadata['drone_info'] = {
                'manufacturer': 'DJI',
                'model': metadata.get('camera_model', 'Unknown'),
            }

    except Exception:
        pass

    return metadata


def is_georeferenced(file_path: str) -> bool:
    """
    Verificar se a imagem tem coordenadas GPS.

    Args:
        file_path: Caminho para o arquivo de imagem

    Returns:
        True se tiver GPS, False caso contrário
    """
    return extract_gps_coordinates(file_path) is not None


def get_supported_formats() -> list:
    """
    Retornar lista de formatos de imagem suportados.
    """
    return ['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.bmp', '.gif']
