"""
Biomass Estimator
Estimativa heuristica de biomassa vegetal usando analise de cobertura, copas e vigor.

Nao depende de torch/YOLO — usa apenas numpy, PIL, cv2 e scipy.
"""

import logging
from typing import Any, Dict

import cv2
import numpy as np
from PIL import Image as PILImage
from scipy import ndimage

logger = logging.getLogger(__name__)


def _compute_exg_mask(image: np.ndarray, threshold_percentile: int = 70) -> tuple:
    """Calcular mascara de vegetacao via Excess Green Index.

    Returns:
        Tuple of (binary_mask, exg_values)
    """
    img_float = image.astype(np.float32) / 255.0
    r, g, b = img_float[:, :, 0], img_float[:, :, 1], img_float[:, :, 2]
    total = r + g + b + 1e-10
    exg = (2.0 * g - r - b) / total

    threshold = np.percentile(exg, threshold_percentile)
    mask = exg > max(threshold, 0.05)
    return mask, exg


def _segment_canopies(
    vegetation_mask: np.ndarray,
    min_canopy_area: int = 50,
    max_canopies: int = 20,
) -> tuple:
    """Segmentar copas individuais via morfologia + componentes conectados.

    Returns:
        Tuple of (canopy_patches list, total_canopy_area, canopy_count)
    """
    # Operacoes morfologicas para separar copas
    mask_uint8 = (vegetation_mask.astype(np.uint8)) * 255
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    opened = cv2.morphologyEx(mask_uint8, cv2.MORPH_OPEN, kernel, iterations=2)
    closed = cv2.morphologyEx(opened, cv2.MORPH_CLOSE, kernel, iterations=1)

    # Componentes conectados
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        closed, connectivity=8
    )

    patches = []
    total_area = 0

    # Ignorar label 0 (fundo)
    for i in range(1, num_labels):
        area = int(stats[i, cv2.CC_STAT_AREA])
        if area < min_canopy_area:
            continue

        cx, cy = int(centroids[i][0]), int(centroids[i][1])
        x = int(stats[i, cv2.CC_STAT_LEFT])
        y = int(stats[i, cv2.CC_STAT_TOP])
        w = int(stats[i, cv2.CC_STAT_WIDTH])
        h = int(stats[i, cv2.CC_STAT_HEIGHT])

        total_area += area
        patches.append({
            "id": len(patches) + 1,
            "center": [cx, cy],
            "area_pixels": area,
            "bbox": [x, y, x + w, y + h],
        })

    # Ordenar por area decrescente e limitar
    patches.sort(key=lambda p: p["area_pixels"], reverse=True)
    patches = patches[:max_canopies]
    for idx, p in enumerate(patches):
        p["id"] = idx + 1

    canopy_count = len(patches)
    return patches, total_area, canopy_count


def _compute_vigor_metrics(
    image: np.ndarray,
    vegetation_mask: np.ndarray,
    exg_values: np.ndarray,
) -> dict:
    """Calcular metricas de vigor/verdor da vegetacao."""
    if vegetation_mask.sum() < 10:
        return {
            "mean_green_intensity": 0.0,
            "mean_exg": 0.0,
            "texture_variance": 0.0,
        }

    # Intensidade verde media na vegetacao
    green_channel = image[:, :, 1].astype(float)
    mean_green = float(np.mean(green_channel[vegetation_mask]))

    # ExG medio na vegetacao
    mean_exg = float(np.mean(exg_values[vegetation_mask]))

    # Variancia de textura (grayscale) na vegetacao
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY).astype(float)
    texture_var = float(np.var(gray[vegetation_mask]))

    return {
        "mean_green_intensity": round(mean_green, 2),
        "mean_exg": round(mean_exg, 4),
        "texture_variance": round(texture_var, 2),
    }


def _compute_biomass_index(
    vegetation_coverage_pct: float,
    canopy_density: float,
    vigor_green: float,
    texture_variance: float,
) -> float:
    """Calcular indice de biomassa (0-100) combinando metricas.

    Pesos:
    - Cobertura vegetal: 40%
    - Densidade de copas: 30%
    - Vigor/verdor medio: 15%
    - Variancia de textura: 15%
    """
    # Normalizar cada componente para 0-100
    cov_score = min(vegetation_coverage_pct, 100.0)

    density_score = min(canopy_density * 100, 100.0)

    # Vigor: green intensity normalizada (0-255 -> 0-100)
    vigor_score = min(vigor_green / 255.0 * 100, 100.0)

    # Textura: variancia alta indica copas densas/complexas (cap em ~2000)
    texture_score = min(texture_variance / 2000.0 * 100, 100.0)

    biomass_index = (
        cov_score * 0.40
        + density_score * 0.30
        + vigor_score * 0.15
        + texture_score * 0.15
    )

    return round(min(max(biomass_index, 0.0), 100.0), 2)


def _classify_density(biomass_index: float) -> str:
    """Classificar densidade de biomassa."""
    if biomass_index < 25:
        return "esparsa"
    elif biomass_index < 50:
        return "moderada"
    elif biomass_index < 75:
        return "densa"
    else:
        return "muito_densa"


def _estimate_biomass_kg_ha(biomass_index: float) -> float:
    """Estimativa heuristica de biomassa em kg/ha.

    Baseado em valores tipicos de literatura para vegetacao tropical:
    - Pastagem/esparsa: 2-10 t/ha
    - Moderada: 10-50 t/ha
    - Densa: 50-150 t/ha
    - Muito densa: 150-400 t/ha

    Interpolacao linear simples baseada no indice.
    """
    # Escala: 0->2000 kg/ha, 100->400000 kg/ha (400 t/ha)
    min_kg = 2000.0
    max_kg = 400000.0
    estimated = min_kg + (biomass_index / 100.0) * (max_kg - min_kg)
    return round(estimated, 0)


def _generate_recommendations(
    biomass_index: float,
    density_class: str,
    vegetation_coverage_pct: float,
    canopy_count: int,
) -> list:
    """Gerar recomendacoes baseadas na estimativa de biomassa."""
    recs = []

    if density_class == "muito_densa":
        recs.append(
            f"Biomassa muito densa (indice {biomass_index:.1f}). "
            "Area com excelente cobertura vegetal e alta produtividade."
        )
    elif density_class == "densa":
        recs.append(
            f"Biomassa densa (indice {biomass_index:.1f}). "
            "Boa cobertura vegetal. Monitorar para manter niveis atuais."
        )
    elif density_class == "moderada":
        recs.append(
            f"Biomassa moderada (indice {biomass_index:.1f}). "
            "Considere avaliar areas com menor cobertura para potencial de melhoria."
        )
    else:
        recs.append(
            f"Biomassa esparsa (indice {biomass_index:.1f}). "
            "Cobertura vegetal baixa. Verificar condicoes do solo e irrigacao."
        )

    if vegetation_coverage_pct < 30:
        recs.append(
            "Cobertura vegetal abaixo de 30%. "
            "Considere replantio ou verificacao de fatores limitantes."
        )

    if canopy_count == 0 and vegetation_coverage_pct > 10:
        recs.append(
            "Vegetacao presente mas sem copas individuais identificadas. "
            "Pode indicar vegetacao rasteira ou gramado uniforme."
        )

    return recs


def estimate_biomass(
    image_path: str,
    min_canopy_area: int = 50,
) -> Dict[str, Any]:
    """
    Estimar biomassa vegetal em uma imagem aerea.

    Args:
        image_path: Caminho para a imagem
        min_canopy_area: Area minima em pixels para considerar uma copa

    Returns:
        Dicionario com resultados da estimativa de biomassa
    """
    # Carregar e preparar imagem
    with PILImage.open(image_path) as img:
        if img.mode != "RGB":
            img = img.convert("RGB")

        # Redimensionar se muito grande
        max_size = 1500
        if max(img.size) > max_size:
            ratio = max_size / max(img.size)
            new_size = (int(img.width * ratio), int(img.height * ratio))
            img = img.resize(new_size, PILImage.Resampling.LANCZOS)

        image = np.array(img)

    total_pixels = image.shape[0] * image.shape[1]

    # 1. Mascara de vegetacao (ExG)
    vegetation_mask, exg_values = _compute_exg_mask(image)
    total_vegetation_pixels = int(vegetation_mask.sum())
    vegetation_coverage_pct = round(total_vegetation_pixels / total_pixels * 100, 2)

    if total_vegetation_pixels < 100:
        return {
            "vegetation_coverage_pct": vegetation_coverage_pct,
            "canopy_count": 0,
            "total_canopy_area_pixels": 0,
            "avg_canopy_area": 0.0,
            "biomass_index": 0.0,
            "density_class": "esparsa",
            "estimated_biomass_kg_ha": 0.0,
            "canopy_patches": [],
            "vigor_metrics": {
                "mean_green_intensity": 0.0,
                "mean_exg": 0.0,
                "texture_variance": 0.0,
            },
            "recommendations": [
                "Vegetacao insuficiente para estimativa de biomassa."
            ],
            "parameters": {
                "min_canopy_area": min_canopy_area,
            },
        }

    # 2. Segmentar copas
    canopy_patches, total_canopy_area, canopy_count = _segment_canopies(
        vegetation_mask, min_canopy_area
    )
    avg_canopy_area = round(total_canopy_area / canopy_count, 2) if canopy_count > 0 else 0.0

    # 3. Metricas de vigor
    vigor = _compute_vigor_metrics(image, vegetation_mask, exg_values)

    # 4. Calcular indice de biomassa
    canopy_density = total_canopy_area / total_pixels if total_pixels > 0 else 0
    biomass_index = _compute_biomass_index(
        vegetation_coverage_pct,
        canopy_density,
        vigor["mean_green_intensity"],
        vigor["texture_variance"],
    )

    # 5. Classificar e estimar
    density_class = _classify_density(biomass_index)
    estimated_kg_ha = _estimate_biomass_kg_ha(biomass_index)

    # 6. Recomendacoes
    recommendations = _generate_recommendations(
        biomass_index, density_class, vegetation_coverage_pct, canopy_count
    )

    return {
        "vegetation_coverage_pct": vegetation_coverage_pct,
        "canopy_count": canopy_count,
        "total_canopy_area_pixels": total_canopy_area,
        "avg_canopy_area": avg_canopy_area,
        "biomass_index": biomass_index,
        "density_class": density_class,
        "estimated_biomass_kg_ha": estimated_kg_ha,
        "canopy_patches": canopy_patches,
        "vigor_metrics": vigor,
        "recommendations": recommendations,
        "parameters": {
            "min_canopy_area": min_canopy_area,
        },
    }
