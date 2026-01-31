"""
Image Processor Service
Processamento básico de imagens: resize, thumbnail, normalização.
"""

import os
from typing import Tuple, Optional
from PIL import Image
import numpy as np


def resize_image(
    image: Image.Image,
    max_size: int = 1920,
    maintain_aspect: bool = True
) -> Image.Image:
    """
    Redimensionar imagem mantendo proporção.

    Args:
        image: Imagem PIL
        max_size: Tamanho máximo do maior lado
        maintain_aspect: Manter proporção original

    Returns:
        Imagem redimensionada
    """
    if maintain_aspect:
        # Calcular novo tamanho mantendo proporção
        ratio = min(max_size / image.width, max_size / image.height)
        if ratio >= 1:
            return image  # Não aumentar imagens menores

        new_size = (int(image.width * ratio), int(image.height * ratio))
    else:
        new_size = (max_size, max_size)

    return image.resize(new_size, Image.Resampling.LANCZOS)


def create_thumbnail(
    image: Image.Image,
    size: Tuple[int, int] = (400, 400)
) -> Image.Image:
    """
    Criar thumbnail da imagem.

    Args:
        image: Imagem PIL
        size: Tamanho do thumbnail (largura, altura)

    Returns:
        Thumbnail da imagem
    """
    # Copiar para não modificar original
    thumb = image.copy()
    thumb.thumbnail(size, Image.Resampling.LANCZOS)
    return thumb


def save_thumbnail(
    input_path: str,
    output_path: str,
    size: Tuple[int, int] = (400, 400)
) -> str:
    """
    Criar e salvar thumbnail de uma imagem.

    Args:
        input_path: Caminho da imagem original
        output_path: Caminho para salvar o thumbnail
        size: Tamanho do thumbnail

    Returns:
        Caminho do thumbnail salvo
    """
    with Image.open(input_path) as img:
        # Converter para RGB se necessário (para JPG)
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')

        thumb = create_thumbnail(img, size)

        # Garantir que o diretório existe
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        thumb.save(output_path, 'JPEG', quality=85)

    return output_path


def image_to_numpy(image: Image.Image) -> np.ndarray:
    """
    Converter imagem PIL para array NumPy.

    Args:
        image: Imagem PIL

    Returns:
        Array NumPy (H, W, C)
    """
    return np.array(image)


def numpy_to_image(array: np.ndarray) -> Image.Image:
    """
    Converter array NumPy para imagem PIL.

    Args:
        array: Array NumPy (H, W, C) ou (H, W)

    Returns:
        Imagem PIL
    """
    return Image.fromarray(array.astype(np.uint8))


def normalize_image(array: np.ndarray) -> np.ndarray:
    """
    Normalizar valores da imagem para 0-255.

    Args:
        array: Array NumPy

    Returns:
        Array normalizado
    """
    arr_min = array.min()
    arr_max = array.max()

    if arr_max - arr_min == 0:
        return np.zeros_like(array, dtype=np.uint8)

    normalized = (array - arr_min) / (arr_max - arr_min) * 255
    return normalized.astype(np.uint8)


def convert_to_rgb(image: Image.Image) -> Image.Image:
    """
    Converter imagem para RGB.

    Args:
        image: Imagem PIL

    Returns:
        Imagem em RGB
    """
    if image.mode == 'RGB':
        return image
    return image.convert('RGB')


def rotate_by_exif(image: Image.Image) -> Image.Image:
    """
    Rotacionar imagem baseado na orientação EXIF.
    Útil para fotos de celular/drone que podem estar rotacionadas.

    Args:
        image: Imagem PIL

    Returns:
        Imagem com orientação corrigida
    """
    try:
        exif = image._getexif()
        if exif is None:
            return image

        orientation_key = 274  # Tag de orientação EXIF

        if orientation_key not in exif:
            return image

        orientation = exif[orientation_key]

        # Aplicar rotação baseada na orientação
        if orientation == 2:
            return image.transpose(Image.FLIP_LEFT_RIGHT)
        elif orientation == 3:
            return image.rotate(180)
        elif orientation == 4:
            return image.transpose(Image.FLIP_TOP_BOTTOM)
        elif orientation == 5:
            return image.transpose(Image.FLIP_LEFT_RIGHT).rotate(90, expand=True)
        elif orientation == 6:
            return image.rotate(-90, expand=True)
        elif orientation == 7:
            return image.transpose(Image.FLIP_LEFT_RIGHT).rotate(-90, expand=True)
        elif orientation == 8:
            return image.rotate(90, expand=True)

    except (AttributeError, KeyError):
        pass

    return image


def crop_center(image: Image.Image, crop_size: Tuple[int, int]) -> Image.Image:
    """
    Recortar o centro da imagem.

    Args:
        image: Imagem PIL
        crop_size: Tamanho do recorte (largura, altura)

    Returns:
        Imagem recortada
    """
    width, height = image.size
    crop_w, crop_h = crop_size

    left = (width - crop_w) // 2
    top = (height - crop_h) // 2
    right = left + crop_w
    bottom = top + crop_h

    return image.crop((left, top, right, bottom))


def get_image_stats(array: np.ndarray) -> dict:
    """
    Calcular estatísticas básicas da imagem.

    Args:
        array: Array NumPy da imagem

    Returns:
        Dicionário com estatísticas
    """
    return {
        'min': float(array.min()),
        'max': float(array.max()),
        'mean': float(array.mean()),
        'std': float(array.std()),
        'shape': array.shape,
    }
