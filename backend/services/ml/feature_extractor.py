"""
Feature Extractor Service
Extração de características visuais de imagens.
"""

import os
from typing import Dict, Any, List, Tuple, Optional
import numpy as np
from PIL import Image
import cv2
from scipy import ndimage
from collections import Counter


def extract_texture_features(image: np.ndarray) -> Dict[str, Any]:
    """
    Extrair características de textura da imagem.

    Args:
        image: Array NumPy RGB (H, W, 3)

    Returns:
        Dicionário com características de textura
    """
    # Converter para escala de cinza
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)

    # 1. Gradientes (Sobel)
    sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    gradient_magnitude = np.sqrt(sobelx**2 + sobely**2)

    # 2. Laplaciano (bordas)
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    laplacian_var = float(laplacian.var())

    # 3. Estatísticas de textura
    texture_energy = float(np.sum(gray.astype(float)**2) / gray.size)
    texture_entropy = float(-np.sum(
        np.histogram(gray, bins=256, range=(0, 256))[0].astype(float) / gray.size *
        np.log2(np.histogram(gray, bins=256, range=(0, 256))[0].astype(float) / gray.size + 1e-10)
    ))

    # 4. Homogeneidade (variância local)
    local_var = ndimage.generic_filter(gray.astype(float), np.var, size=5)
    homogeneity = float(1 / (1 + local_var.mean()))

    # 5. Contraste
    contrast = float(gray.std())

    # Classificar textura dominante
    if laplacian_var > 1000:
        texture_type = 'muito_rugosa'
    elif laplacian_var > 500:
        texture_type = 'rugosa'
    elif laplacian_var > 100:
        texture_type = 'moderada'
    else:
        texture_type = 'suave'

    return {
        'gradient_mean': round(float(gradient_magnitude.mean()), 2),
        'gradient_std': round(float(gradient_magnitude.std()), 2),
        'laplacian_variance': round(laplacian_var, 2),
        'energy': round(texture_energy, 2),
        'entropy': round(texture_entropy, 4),
        'homogeneity': round(homogeneity, 4),
        'contrast': round(contrast, 2),
        'texture_type': texture_type,
    }


def extract_color_features(image: np.ndarray) -> Dict[str, Any]:
    """
    Extrair características de cor da imagem.

    Args:
        image: Array NumPy RGB (H, W, 3)

    Returns:
        Dicionário com características de cor
    """
    r, g, b = image[:, :, 0], image[:, :, 1], image[:, :, 2]

    # Converter para HSV
    hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
    h, s, v = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]

    # Estatísticas RGB
    rgb_stats = {
        'red': {'mean': float(r.mean()), 'std': float(r.std())},
        'green': {'mean': float(g.mean()), 'std': float(g.std())},
        'blue': {'mean': float(b.mean()), 'std': float(b.std())},
    }

    # Estatísticas HSV
    hsv_stats = {
        'hue': {'mean': float(h.mean()), 'std': float(h.std())},
        'saturation': {'mean': float(s.mean()), 'std': float(s.std())},
        'value': {'mean': float(v.mean()), 'std': float(v.std())},
    }

    # Cor dominante (usando histograma de matiz)
    h_hist, _ = np.histogram(h[s > 30], bins=18, range=(0, 180))
    dominant_hue_bin = int(np.argmax(h_hist))
    dominant_hue = dominant_hue_bin * 10  # Cada bin = 10 graus

    # Mapear matiz para cor
    if dominant_hue < 15 or dominant_hue >= 165:
        dominant_color = 'vermelho'
    elif dominant_hue < 30:
        dominant_color = 'laranja'
    elif dominant_hue < 45:
        dominant_color = 'amarelo'
    elif dominant_hue < 75:
        dominant_color = 'verde_claro'
    elif dominant_hue < 105:
        dominant_color = 'verde'
    elif dominant_hue < 135:
        dominant_color = 'ciano'
    elif dominant_hue < 165:
        dominant_color = 'azul'
    else:
        dominant_color = 'roxo'

    # Brilho e saturação médios
    brightness = float(v.mean())
    saturation = float(s.mean())

    # Classificar imagem por cor
    if saturation < 30:
        color_type = 'acromatica'  # Preto/branco/cinza
    elif brightness < 50:
        color_type = 'escura'
    elif brightness > 200:
        color_type = 'clara'
    else:
        color_type = 'colorida'

    return {
        'rgb_stats': {k: {kk: round(vv, 2) for kk, vv in v.items()} for k, v in rgb_stats.items()},
        'hsv_stats': {k: {kk: round(vv, 2) for kk, vv in v.items()} for k, v in hsv_stats.items()},
        'dominant_hue': dominant_hue,
        'dominant_color': dominant_color,
        'brightness': round(brightness, 2),
        'saturation': round(saturation, 2),
        'color_type': color_type,
        'is_predominantly_green': bool(g.mean() > r.mean() and g.mean() > b.mean()),
    }


def detect_patterns(image: np.ndarray) -> Dict[str, Any]:
    """
    Detectar padrões na imagem (linhas, círculos, etc).

    Args:
        image: Array NumPy RGB (H, W, 3)

    Returns:
        Dicionário com padrões detectados
    """
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)

    # Redimensionar para processamento mais rápido
    scale = 1.0
    if max(gray.shape) > 1000:
        scale = 1000 / max(gray.shape)
        gray = cv2.resize(gray, None, fx=scale, fy=scale)

    # 1. Detectar linhas (Hough)
    edges = cv2.Canny(gray, 50, 150)
    lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=50,
                            minLineLength=30, maxLineGap=10)

    num_lines = len(lines) if lines is not None else 0

    # Analisar orientações das linhas
    orientations = []
    if lines is not None:
        for line in lines:
            x1, y1, x2, y2 = line[0]
            angle = np.arctan2(y2 - y1, x2 - x1) * 180 / np.pi
            orientations.append(angle % 180)

    # Determinar orientação dominante
    if orientations:
        orientation_hist, _ = np.histogram(orientations, bins=18, range=(0, 180))
        dominant_orientation = int(np.argmax(orientation_hist)) * 10

        if dominant_orientation < 20 or dominant_orientation >= 160:
            orientation_type = 'horizontal'
        elif 70 < dominant_orientation < 110:
            orientation_type = 'vertical'
        else:
            orientation_type = 'diagonal'
    else:
        dominant_orientation = None
        orientation_type = 'indefinida'

    # 2. Detectar círculos (Hough)
    circles = cv2.HoughCircles(
        gray, cv2.HOUGH_GRADIENT, dp=1, minDist=30,
        param1=50, param2=30, minRadius=10, maxRadius=100
    )
    num_circles = len(circles[0]) if circles is not None else 0

    # 3. Detectar contornos
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    num_contours = len(contours)

    # Analisar formas dos contornos
    shape_counts = {'circular': 0, 'retangular': 0, 'irregular': 0}
    for contour in contours[:100]:  # Limitar a 100 contornos
        if len(contour) < 5:
            continue

        # Calcular circularidade
        area = cv2.contourArea(contour)
        perimeter = cv2.arcLength(contour, True)
        if perimeter > 0:
            circularity = 4 * np.pi * area / (perimeter ** 2)

            if circularity > 0.8:
                shape_counts['circular'] += 1
            elif circularity > 0.5:
                shape_counts['retangular'] += 1
            else:
                shape_counts['irregular'] += 1

    # Determinar padrão dominante
    if num_lines > 50:
        pattern_type = 'linear'  # Plantação em linhas
    elif num_circles > 10:
        pattern_type = 'circular'  # Pivôs de irrigação
    elif shape_counts['irregular'] > shape_counts['circular'] + shape_counts['retangular']:
        pattern_type = 'organico'  # Vegetação natural
    else:
        pattern_type = 'misto'

    return {
        'lines': {
            'count': num_lines,
            'dominant_orientation': dominant_orientation,
            'orientation_type': orientation_type,
        },
        'circles': {
            'count': num_circles,
        },
        'contours': {
            'count': num_contours,
            'shapes': shape_counts,
        },
        'pattern_type': pattern_type,
        'has_regular_pattern': num_lines > 20 or num_circles > 5,
    }


def detect_anomalies(image: np.ndarray, threshold: float = 2.0) -> Dict[str, Any]:
    """
    Detectar anomalias visuais na imagem.

    Args:
        image: Array NumPy RGB (H, W, 3)
        threshold: Número de desvios padrão para considerar anomalia

    Returns:
        Dicionário com anomalias detectadas
    """
    # Converter para escala de cinza
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY).astype(float)

    # Calcular estatísticas locais
    window_size = 51
    local_mean = cv2.blur(gray, (window_size, window_size))
    local_sq_mean = cv2.blur(gray**2, (window_size, window_size))
    local_std = np.sqrt(np.maximum(local_sq_mean - local_mean**2, 0))

    # Detectar pixels anômalos
    with np.errstate(divide='ignore', invalid='ignore'):
        z_score = np.abs((gray - local_mean) / (local_std + 1e-10))

    anomaly_mask = z_score > threshold
    anomaly_percentage = float(anomaly_mask.sum() / anomaly_mask.size * 100)

    # Encontrar regiões anômalas
    labeled, num_features = ndimage.label(anomaly_mask)

    # Analisar regiões
    regions = []
    for i in range(1, min(num_features + 1, 11)):  # Máximo 10 regiões
        region_mask = labeled == i
        region_size = region_mask.sum()
        if region_size > 100:  # Ignorar regiões muito pequenas
            y_coords, x_coords = np.where(region_mask)
            center_y = int(y_coords.mean())
            center_x = int(x_coords.mean())
            regions.append({
                'center': (center_x, center_y),
                'size_pixels': int(region_size),
                'percentage': round(region_size / gray.size * 100, 4),
            })

    return {
        'anomaly_percentage': round(anomaly_percentage, 2),
        'num_anomaly_regions': num_features,
        'significant_regions': regions,
        'has_significant_anomalies': anomaly_percentage > 5,
    }


def extract_all_features(image_path: str) -> Dict[str, Any]:
    """
    Extrair todas as características de uma imagem.

    Args:
        image_path: Caminho para a imagem

    Returns:
        Dicionário com todas as características
    """
    with Image.open(image_path) as img:
        if img.mode != 'RGB':
            img = img.convert('RGB')

        # Redimensionar para processamento mais rápido
        max_size = 1000
        if max(img.size) > max_size:
            ratio = max_size / max(img.size)
            new_size = (int(img.width * ratio), int(img.height * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)

        image = np.array(img)

    return {
        'texture': extract_texture_features(image),
        'color': extract_color_features(image),
        'patterns': detect_patterns(image),
        'anomalies': detect_anomalies(image),
        'image_size': {
            'width': image.shape[1],
            'height': image.shape[0],
        },
    }
