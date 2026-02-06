"""
Tree Counter Service
Contagem de árvores usando segmentação de vegetação (ExG).
Não depende de YOLO/ultralytics.
"""

from typing import Dict, Any
import numpy as np
from PIL import Image
import cv2


def count_trees_by_segmentation(
    image_path: str,
    exg_threshold: float = None,  # None = auto-calculate
    min_tree_area: int = 50,
    max_tree_area: int = 15000,
    kernel_size: int = 5
) -> Dict[str, Any]:
    """
    Contar árvores/plantas em imagem aérea usando segmentação de vegetação.

    Esta função é mais adequada para imagens aéreas agrícolas onde o
    modelo YOLO padrão não detecta árvores.

    Algoritmo:
    1. Calcula ExG (Excess Green) para identificar vegetação
    2. Calcula threshold automaticamente baseado no percentil do ExG
    3. Usa operações morfológicas para separar árvores
    4. Conta componentes conectados como árvores individuais

    Args:
        image_path: Caminho para a imagem
        exg_threshold: Limiar de ExG (None = auto-calcula baseado no percentil 70)
        min_tree_area: Área mínima em pixels para considerar como árvore
        max_tree_area: Área máxima em pixels (evita contar áreas muito grandes)
        kernel_size: Tamanho do kernel para operações morfológicas

    Returns:
        Dicionário com contagem e estatísticas das árvores
    """
    # Carregar imagem
    with Image.open(image_path) as img:
        if img.mode != 'RGB':
            img = img.convert('RGB')

        # Redimensionar se muito grande
        max_size = 2000
        scale = 1.0
        if max(img.size) > max_size:
            scale = max_size / max(img.size)
            new_size = (int(img.width * scale), int(img.height * scale))
            img = img.resize(new_size, Image.Resampling.LANCZOS)

        image_array = np.array(img)

    # Converter para float e normalizar
    img_float = image_array.astype(np.float32) / 255.0
    r, g, b = img_float[:, :, 0], img_float[:, :, 1], img_float[:, :, 2]

    # Calcular ExG (Excess Green Index)
    # ExG = 2G - R - B, normalizado para 0-1
    total = r + g + b + 1e-10
    exg = (2 * g - r - b) / total
    exg = (exg + 1) / 2  # Normalizar de [-1,1] para [0,1]

    # Auto-calcular threshold se não fornecido
    # Usa percentil 70 do ExG para detectar apenas as áreas mais verdes (copas de árvores)
    if exg_threshold is None:
        exg_threshold = np.percentile(exg, 70)
        # Garantir que threshold está em faixa razoável
        exg_threshold = max(0.5, min(0.7, exg_threshold))

    # Criar máscara de vegetação
    vegetation_mask = (exg > exg_threshold).astype(np.uint8) * 255

    # Operações morfológicas para separar árvores individuais
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))

    # Erosão para separar árvores conectadas
    eroded = cv2.erode(vegetation_mask, kernel, iterations=2)

    # Dilatação para restaurar tamanho aproximado
    processed = cv2.dilate(eroded, kernel, iterations=1)

    # Encontrar componentes conectados
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        processed, connectivity=8
    )

    # Filtrar por área (ignorar background que é label 0)
    trees = []
    total_tree_area = 0

    for i in range(1, num_labels):  # Começar de 1 para ignorar background
        area = stats[i, cv2.CC_STAT_AREA]

        # Ajustar limites de área pelo fator de escala
        adjusted_min = min_tree_area * (scale ** 2)
        adjusted_max = max_tree_area * (scale ** 2)

        if adjusted_min <= area <= adjusted_max:
            x = stats[i, cv2.CC_STAT_LEFT]
            y = stats[i, cv2.CC_STAT_TOP]
            w = stats[i, cv2.CC_STAT_WIDTH]
            h = stats[i, cv2.CC_STAT_HEIGHT]
            cx, cy = centroids[i]

            # Ajustar coordenadas de volta à escala original
            if scale != 1.0:
                x = int(x / scale)
                y = int(y / scale)
                w = int(w / scale)
                h = int(h / scale)
                cx = cx / scale
                cy = cy / scale
                area = int(area / (scale ** 2))

            trees.append({
                'id': len(trees) + 1,
                'bbox': (int(x), int(y), int(x + w), int(y + h)),
                'center': (int(cx), int(cy)),
                'area_pixels': int(area),
                'width': int(w),
                'height': int(h),
            })
            total_tree_area += int(area)

    # Calcular estatísticas
    if trees:
        areas = [t['area_pixels'] for t in trees]
        avg_area = sum(areas) / len(areas)
        min_area_found = min(areas)
        max_area_found = max(areas)
    else:
        avg_area = 0
        min_area_found = 0
        max_area_found = 0

    # Dimensões originais da imagem
    with Image.open(image_path) as img:
        original_width, original_height = img.size

    total_pixels = original_width * original_height
    coverage_percentage = (total_tree_area / total_pixels) * 100 if total_pixels > 0 else 0

    return {
        'total_trees': int(len(trees)),
        'total_tree_area_pixels': int(total_tree_area),
        'coverage_percentage': float(round(coverage_percentage, 2)),
        'avg_tree_area': float(round(avg_area, 1)),
        'min_tree_area': int(min_area_found),
        'max_tree_area': int(max_area_found),
        'trees': trees[:100],  # Limitar a 100 árvores nos detalhes
        'image_dimensions': {
            'width': int(original_width),
            'height': int(original_height),
        },
        'parameters': {
            'exg_threshold': float(exg_threshold),  # Converter np.float32 para float Python
            'min_tree_area': int(min_tree_area),
            'max_tree_area': int(max_tree_area),
        }
    }
