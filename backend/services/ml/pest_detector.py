"""
Pest & Disease Detector
Deteccao heuristica de pragas e doencas em vegetacao usando analise de cor e textura.

Nao depende de torch/YOLO — usa apenas numpy, PIL, cv2 e scipy.
"""

import logging
from typing import Any, Dict

import cv2
import numpy as np
from PIL import Image as PILImage
from scipy import ndimage

logger = logging.getLogger(__name__)


def _compute_exg_mask(image: np.ndarray, threshold_percentile: int = 70) -> np.ndarray:
    """Calcular mascara de vegetacao via Excess Green Index."""
    img_float = image.astype(np.float32) / 255.0
    r, g, b = img_float[:, :, 0], img_float[:, :, 1], img_float[:, :, 2]
    total = r + g + b + 1e-10
    exg = (2.0 * g - r - b) / total

    threshold = np.percentile(exg, threshold_percentile)
    mask = exg > max(threshold, 0.05)
    return mask


def _detect_chlorosis(hsv: np.ndarray, vegetation_mask: np.ndarray) -> np.ndarray:
    """Detectar clorose (amarelecimento) dentro da vegetacao.

    Pixels amarelados: H 20-40, S > 50.
    """
    h, s, _ = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
    chlorosis = (
        (h >= 20) & (h <= 40) &
        (s > 50) &
        vegetation_mask
    )
    return chlorosis


def _detect_necrosis(hsv: np.ndarray, vegetation_mask: np.ndarray) -> np.ndarray:
    """Detectar necrose (tecido morto/marrom) dentro da vegetacao.

    Pixels marrons: H 10-25, S > 30, V < 150.
    """
    h, s, v = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
    necrosis = (
        (h >= 10) & (h <= 25) &
        (s > 30) &
        (v < 150) &
        vegetation_mask
    )
    return necrosis


def _detect_texture_anomalies(
    image: np.ndarray,
    vegetation_mask: np.ndarray,
    threshold: float = 2.0,
) -> np.ndarray:
    """Detectar anomalias de textura via variancia local (z-score)."""
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY).astype(float)

    window_size = 51
    local_mean = cv2.blur(gray, (window_size, window_size))
    local_sq_mean = cv2.blur(gray ** 2, (window_size, window_size))
    local_std = np.sqrt(np.maximum(local_sq_mean - local_mean ** 2, 0))

    with np.errstate(divide='ignore', invalid='ignore'):
        z_score = np.abs((gray - local_mean) / (local_std + 1e-10))

    anomaly = (z_score > threshold) & vegetation_mask
    return anomaly


def _extract_regions(
    mask: np.ndarray,
    region_type: str,
    min_area: int,
    max_regions: int = 20,
) -> list:
    """Extrair regioes conectadas de uma mascara binaria."""
    labeled, num_features = ndimage.label(mask)
    regions = []

    for i in range(1, num_features + 1):
        region_mask = labeled == i
        area = int(region_mask.sum())
        if area < min_area:
            continue

        y_coords, x_coords = np.where(region_mask)
        center_y = int(y_coords.mean())
        center_x = int(x_coords.mean())
        min_y, max_y = int(y_coords.min()), int(y_coords.max())
        min_x, max_x = int(x_coords.min()), int(x_coords.max())

        regions.append({
            "id": len(regions) + 1,
            "type": region_type,
            "center": [center_x, center_y],
            "area_pixels": area,
            "bbox": [min_x, min_y, max_x, max_y],
        })

        if len(regions) >= max_regions:
            break

    # Ordenar por area decrescente
    regions.sort(key=lambda r: r["area_pixels"], reverse=True)
    # Re-numerar IDs
    for idx, reg in enumerate(regions):
        reg["id"] = idx + 1

    return regions


def _classify_severity(infection_rate: float) -> str:
    """Classificar severidade baseado na taxa de infeccao."""
    if infection_rate < 5:
        return "saudavel"
    elif infection_rate < 15:
        return "leve"
    elif infection_rate < 30:
        return "moderado"
    else:
        return "severo"


def _generate_recommendations(
    severity: str,
    chlorosis_pct: float,
    necrosis_pct: float,
    anomaly_pct: float,
) -> list:
    """Gerar recomendacoes baseadas nos resultados."""
    recs = []

    if severity == "saudavel":
        recs.append("Vegetacao saudavel. Manter monitoramento regular.")
        return recs

    if chlorosis_pct > 5:
        recs.append(
            f"Clorose detectada em {chlorosis_pct:.1f}% da vegetacao. "
            "Verificar deficiencia de nitrogenio, ferro ou magnesio."
        )
    if necrosis_pct > 5:
        recs.append(
            f"Necrose detectada em {necrosis_pct:.1f}% da vegetacao. "
            "Investigar possivel infeccao fungica ou bacteriana."
        )
    if anomaly_pct > 5:
        recs.append(
            f"Anomalias de textura em {anomaly_pct:.1f}% da vegetacao. "
            "Pode indicar danos por insetos ou estresse hidrico."
        )

    if severity == "severo":
        recs.append(
            "Severidade alta. Recomenda-se inspecao presencial urgente "
            "e coleta de amostras para diagnostico laboratorial."
        )
    elif severity == "moderado":
        recs.append(
            "Severidade moderada. Agendar inspecao presencial para "
            "confirmar diagnostico e iniciar tratamento."
        )
    else:
        recs.append(
            "Severidade leve. Continuar monitoramento e observar "
            "evolucao nas proximas semanas."
        )

    return recs


def detect_pest_disease(
    image_path: str,
    anomaly_threshold: float = 2.0,
    min_region_area: int = 100,
) -> Dict[str, Any]:
    """
    Detectar pragas e doencas em vegetacao via analise de cor e textura.

    Args:
        image_path: Caminho para a imagem
        anomaly_threshold: Limiar de z-score para anomalias de textura
        min_region_area: Area minima em pixels para considerar uma regiao

    Returns:
        Dicionario com resultados da deteccao
    """
    # Carregar e preparar imagem
    with PILImage.open(image_path) as img:
        if img.mode != 'RGB':
            img = img.convert('RGB')

        # Redimensionar se muito grande
        max_size = 1500
        if max(img.size) > max_size:
            ratio = max_size / max(img.size)
            new_size = (int(img.width * ratio), int(img.height * ratio))
            img = img.resize(new_size, PILImage.Resampling.LANCZOS)

        image = np.array(img)

    # 1. Mascara de vegetacao (ExG)
    vegetation_mask = _compute_exg_mask(image)
    total_vegetation_pixels = int(vegetation_mask.sum())

    if total_vegetation_pixels < 100:
        return {
            "total_vegetation_pixels": total_vegetation_pixels,
            "healthy_percentage": 0.0,
            "chlorosis_percentage": 0.0,
            "necrosis_percentage": 0.0,
            "anomaly_percentage": 0.0,
            "overall_severity": "saudavel",
            "infection_rate": 0.0,
            "affected_regions": [],
            "recommendations": ["Vegetacao insuficiente para analise de pragas/doencas."],
            "parameters": {
                "chlorosis_hue_range": [20, 40],
                "necrosis_hue_range": [10, 25],
                "anomaly_threshold": anomaly_threshold,
            },
        }

    # 2. Converter para HSV
    hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)

    # 3. Detectar sintomas
    chlorosis_mask = _detect_chlorosis(hsv, vegetation_mask)
    necrosis_mask = _detect_necrosis(hsv, vegetation_mask)
    anomaly_mask = _detect_texture_anomalies(image, vegetation_mask, anomaly_threshold)

    # Remover sobreposicoes: prioridade necrose > clorose > anomalia
    anomaly_mask = anomaly_mask & ~chlorosis_mask & ~necrosis_mask
    chlorosis_mask = chlorosis_mask & ~necrosis_mask

    # 4. Calcular percentuais
    chlorosis_pixels = int(chlorosis_mask.sum())
    necrosis_pixels = int(necrosis_mask.sum())
    anomaly_pixels = int(anomaly_mask.sum())

    chlorosis_pct = round(chlorosis_pixels / total_vegetation_pixels * 100, 2)
    necrosis_pct = round(necrosis_pixels / total_vegetation_pixels * 100, 2)
    anomaly_pct = round(anomaly_pixels / total_vegetation_pixels * 100, 2)
    infection_rate = round(chlorosis_pct + necrosis_pct + anomaly_pct, 2)
    healthy_pct = round(max(100.0 - infection_rate, 0.0), 2)

    # 5. Classificar severidade
    severity = _classify_severity(infection_rate)

    # 6. Extrair regioes afetadas (top 20 total)
    max_per_type = 7
    chlorosis_regions = _extract_regions(chlorosis_mask, "chlorosis", min_region_area, max_per_type)
    necrosis_regions = _extract_regions(necrosis_mask, "necrosis", min_region_area, max_per_type)
    anomaly_regions = _extract_regions(anomaly_mask, "anomaly", min_region_area, max_per_type)

    all_regions = chlorosis_regions + necrosis_regions + anomaly_regions
    all_regions.sort(key=lambda r: r["area_pixels"], reverse=True)
    all_regions = all_regions[:20]
    for idx, reg in enumerate(all_regions):
        reg["id"] = idx + 1

    # 7. Recomendacoes
    recommendations = _generate_recommendations(severity, chlorosis_pct, necrosis_pct, anomaly_pct)

    return {
        "total_vegetation_pixels": total_vegetation_pixels,
        "healthy_percentage": healthy_pct,
        "chlorosis_percentage": chlorosis_pct,
        "necrosis_percentage": necrosis_pct,
        "anomaly_percentage": anomaly_pct,
        "overall_severity": severity,
        "infection_rate": infection_rate,
        "affected_regions": all_regions,
        "recommendations": recommendations,
        "parameters": {
            "chlorosis_hue_range": [20, 40],
            "necrosis_hue_range": [10, 25],
            "anomaly_threshold": anomaly_threshold,
        },
    }
