"""
Image Analyzer Service
Análises básicas de vegetação e cobertura do solo.
Para imagens RGB de drone (sem bandas espectrais NIR).
"""

import numpy as np
from PIL import Image
from typing import Dict, Any, Tuple, Optional


def calculate_excess_green_index(image: np.ndarray) -> np.ndarray:
    """
    Calcular Excess Green Index (ExG) para detectar vegetação.
    Funciona com imagens RGB comuns (sem NIR).

    ExG = 2*G - R - B

    Valores altos indicam vegetação verde.

    Args:
        image: Array NumPy RGB (H, W, 3)

    Returns:
        Array com índice ExG normalizado (0-1)
    """
    # Normalizar para 0-1
    img_float = image.astype(np.float32) / 255.0

    r = img_float[:, :, 0]
    g = img_float[:, :, 1]
    b = img_float[:, :, 2]

    # Evitar divisão por zero
    total = r + g + b
    total[total == 0] = 1

    # Normalizar canais
    r_norm = r / total
    g_norm = g / total
    b_norm = b / total

    # Calcular ExG
    exg = 2 * g_norm - r_norm - b_norm

    # Normalizar para 0-1
    exg_normalized = (exg - exg.min()) / (exg.max() - exg.min() + 1e-6)

    return exg_normalized


def calculate_green_leaf_index(image: np.ndarray) -> np.ndarray:
    """
    Calcular Green Leaf Index (GLI).
    Outro índice para detectar vegetação em RGB.

    GLI = (2*G - R - B) / (2*G + R + B)

    Args:
        image: Array NumPy RGB (H, W, 3)

    Returns:
        Array com índice GLI (-1 a 1)
    """
    img_float = image.astype(np.float32)

    r = img_float[:, :, 0]
    g = img_float[:, :, 1]
    b = img_float[:, :, 2]

    numerator = 2 * g - r - b
    denominator = 2 * g + r + b

    # Evitar divisão por zero
    denominator[denominator == 0] = 1

    gli = numerator / denominator

    return gli


def calculate_vegetation_coverage(
    image: np.ndarray,
    threshold: float = 0.3
) -> Dict[str, float]:
    """
    Calcular percentual de cobertura vegetal na imagem.

    Args:
        image: Array NumPy RGB (H, W, 3)
        threshold: Limiar para considerar vegetação (0-1)

    Returns:
        Dicionário com estatísticas de cobertura
    """
    exg = calculate_excess_green_index(image)

    # Criar máscara de vegetação
    vegetation_mask = exg > threshold

    total_pixels = exg.size
    vegetation_pixels = vegetation_mask.sum()

    coverage_percentage = (vegetation_pixels / total_pixels) * 100

    return {
        'vegetation_percentage': round(coverage_percentage, 2),
        'non_vegetation_percentage': round(100 - coverage_percentage, 2),
        'total_pixels': int(total_pixels),
        'vegetation_pixels': int(vegetation_pixels),
        'threshold_used': threshold,
    }


def detect_vegetation_mask(
    image: np.ndarray,
    threshold: float = 0.3
) -> np.ndarray:
    """
    Criar máscara binária de vegetação.

    Args:
        image: Array NumPy RGB (H, W, 3)
        threshold: Limiar para considerar vegetação

    Returns:
        Máscara binária (0 ou 255)
    """
    exg = calculate_excess_green_index(image)
    mask = (exg > threshold).astype(np.uint8) * 255
    return mask


def calculate_color_histogram(image: np.ndarray, bins: int = 32) -> Dict[str, list]:
    """
    Calcular histograma de cores da imagem.

    Args:
        image: Array NumPy RGB (H, W, 3)
        bins: Número de bins do histograma

    Returns:
        Dicionário com histogramas R, G, B
    """
    histograms = {}

    for i, channel in enumerate(['red', 'green', 'blue']):
        hist, _ = np.histogram(image[:, :, i], bins=bins, range=(0, 256))
        histograms[channel] = hist.tolist()

    return histograms


def analyze_image_colors(image: np.ndarray) -> Dict[str, Any]:
    """
    Analisar distribuição de cores da imagem.

    Args:
        image: Array NumPy RGB (H, W, 3)

    Returns:
        Estatísticas de cor
    """
    r = image[:, :, 0]
    g = image[:, :, 1]
    b = image[:, :, 2]

    return {
        'red': {
            'mean': float(r.mean()),
            'std': float(r.std()),
            'min': int(r.min()),
            'max': int(r.max()),
        },
        'green': {
            'mean': float(g.mean()),
            'std': float(g.std()),
            'min': int(g.min()),
            'max': int(g.max()),
        },
        'blue': {
            'mean': float(b.mean()),
            'std': float(b.std()),
            'min': int(b.min()),
            'max': int(b.max()),
        },
        'brightness': float(image.mean()),
        'is_predominantly_green': bool(g.mean() > r.mean() and g.mean() > b.mean()),
    }


def estimate_vegetation_health(image: np.ndarray) -> Dict[str, Any]:
    """
    Estimar saúde da vegetação baseado em análise de cores.
    Nota: Esta é uma estimativa simplificada para imagens RGB.
    Para análise precisa, seria necessário imagens multiespectrais (NIR).

    Args:
        image: Array NumPy RGB (H, W, 3)

    Returns:
        Estimativa de saúde da vegetação
    """
    # Calcular índices
    exg = calculate_excess_green_index(image)
    gli = calculate_green_leaf_index(image)

    # Criar máscaras de vegetação com diferentes níveis
    healthy_mask = exg > 0.5  # Vegetação muito verde
    moderate_mask = (exg > 0.25) & (exg <= 0.5)  # Vegetação moderada
    stressed_mask = (exg > 0.1) & (exg <= 0.25)  # Vegetação com estresse
    non_veg_mask = exg <= 0.1  # Não vegetação

    total = exg.size

    # Calcular percentuais
    healthy_pct = (healthy_mask.sum() / total) * 100
    moderate_pct = (moderate_mask.sum() / total) * 100
    stressed_pct = (stressed_mask.sum() / total) * 100
    non_veg_pct = (non_veg_mask.sum() / total) * 100

    # Índice geral de saúde (0-100)
    vegetation_total = healthy_pct + moderate_pct + stressed_pct
    if vegetation_total > 0:
        health_index = (
            (healthy_pct * 100 + moderate_pct * 70 + stressed_pct * 30) /
            vegetation_total
        )
    else:
        health_index = 0

    return {
        'health_index': round(health_index, 1),
        'healthy_percentage': round(healthy_pct, 1),
        'moderate_percentage': round(moderate_pct, 1),
        'stressed_percentage': round(stressed_pct, 1),
        'non_vegetation_percentage': round(non_veg_pct, 1),
        'vegetation_total_percentage': round(vegetation_total, 1),
        'mean_exg': round(float(exg.mean()), 3),
        'mean_gli': round(float(gli.mean()), 3),
    }


def generate_vegetation_heatmap(
    image: np.ndarray,
    colormap: str = 'green'
) -> np.ndarray:
    """
    Gerar mapa de calor de vegetação.

    Args:
        image: Array NumPy RGB (H, W, 3)
        colormap: Tipo de colormap ('green', 'jet', 'viridis')

    Returns:
        Imagem RGB do mapa de calor
    """
    exg = calculate_excess_green_index(image)

    # Normalizar para 0-255
    exg_uint8 = (exg * 255).astype(np.uint8)

    # Criar mapa de calor RGB
    if colormap == 'green':
        # Verde = vegetação, marrom = solo
        heatmap = np.zeros((exg.shape[0], exg.shape[1], 3), dtype=np.uint8)
        heatmap[:, :, 0] = 139 - (exg_uint8 * 0.5).astype(np.uint8)  # R (marrom para baixo)
        heatmap[:, :, 1] = exg_uint8  # G (verde para vegetação)
        heatmap[:, :, 2] = 69 - (exg_uint8 * 0.3).astype(np.uint8)  # B

    elif colormap == 'jet':
        # Gradiente vermelho-amarelo-verde
        heatmap = np.zeros((exg.shape[0], exg.shape[1], 3), dtype=np.uint8)
        heatmap[:, :, 0] = 255 - exg_uint8  # R
        heatmap[:, :, 1] = exg_uint8  # G
        heatmap[:, :, 2] = 0  # B

    else:  # viridis-like
        heatmap = np.zeros((exg.shape[0], exg.shape[1], 3), dtype=np.uint8)
        heatmap[:, :, 0] = (exg_uint8 * 0.3).astype(np.uint8)
        heatmap[:, :, 1] = exg_uint8
        heatmap[:, :, 2] = (255 - exg_uint8 * 0.5).astype(np.uint8)

    return heatmap


def run_basic_analysis(image_path: str) -> Dict[str, Any]:
    """
    Executar análise básica completa de uma imagem.

    Args:
        image_path: Caminho para a imagem

    Returns:
        Dicionário com todos os resultados da análise
    """
    # Carregar imagem
    with Image.open(image_path) as img:
        if img.mode != 'RGB':
            img = img.convert('RGB')
        image_array = np.array(img)

    # Executar análises
    coverage = calculate_vegetation_coverage(image_array)
    health = estimate_vegetation_health(image_array)
    colors = analyze_image_colors(image_array)
    histogram = calculate_color_histogram(image_array)

    return {
        'coverage': coverage,
        'health': health,
        'colors': colors,
        'histogram': histogram,
        'image_size': {
            'width': image_array.shape[1],
            'height': image_array.shape[0],
        }
    }
