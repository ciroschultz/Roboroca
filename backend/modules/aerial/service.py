"""
Aerial module service - Logica de negocio da Vertente A (Descricao de Imagens Aereas).
"""

import os
from typing import Optional

import numpy as np
from fastapi import HTTPException, status
from PIL import Image as PILImage
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.image import Image
from backend.models.project import Project
from backend.models.user import User


async def get_user_image(
    image_id: int,
    current_user: User,
    db: AsyncSession,
) -> Image:
    """Helper para buscar imagem do usuario."""
    result = await db.execute(
        select(Image)
        .where(Image.id == image_id)
        .where(Image.project.has(Project.owner_id == current_user.id))
    )
    image = result.scalar_one_or_none()

    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imagem nao encontrada",
        )

    if not os.path.exists(image.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arquivo de imagem nao encontrado",
        )

    return image


def is_image_file(filename: str) -> bool:
    """Verificar se e arquivo de imagem (nao video)."""
    ext = os.path.splitext(filename)[1].lower()
    return ext in {".tif", ".tiff", ".jpg", ".jpeg", ".png", ".geotiff"}


def is_video_file(filename: str) -> bool:
    """Verificar se e arquivo de video."""
    ext = os.path.splitext(filename)[1].lower()
    return ext in {".mov", ".mp4", ".avi", ".mkv", ".wmv", ".flv"}


async def get_roi_mask_for_image(
    image: Image, db: AsyncSession
) -> Optional[np.ndarray]:
    """
    Construir roi_mask a partir do perimeter_polygon da imagem ou do projeto.
    Retorna None se nao houver perimetro definido.
    """
    perimeter = image.perimeter_polygon
    if not perimeter:
        result = await db.execute(
            select(Project).where(Project.id == image.project_id)
        )
        project = result.scalar_one_or_none()
        if project:
            perimeter = project.perimeter_polygon

    if not perimeter or len(perimeter) < 3:
        return None

    try:
        import cv2

        with PILImage.open(image.file_path) as img:
            w, h = img.size
        mask = np.zeros((h, w), dtype=np.uint8)
        pts = np.array(
            [[int(p[0] * w), int(p[1] * h)] for p in perimeter],
            dtype=np.int32,
        )
        cv2.fillPoly(mask, [pts], 1)
        return mask
    except Exception:
        return None


def generate_recommendations(results: dict) -> list:
    """Gerar recomendacoes baseadas nos resultados da analise."""
    recommendations = []

    coverage = results.get("coverage", {})
    health = results.get("health", {})

    veg_pct = coverage.get("vegetation_percentage", 0)
    if veg_pct < 30:
        recommendations.append(
            {
                "type": "warning",
                "category": "cobertura",
                "message": "Baixa cobertura vegetal detectada. Considere verificar a area para possiveis problemas de plantio ou erosao.",
            }
        )
    elif veg_pct > 80:
        recommendations.append(
            {
                "type": "info",
                "category": "cobertura",
                "message": "Excelente cobertura vegetal. A area apresenta boa densidade de vegetacao.",
            }
        )

    health_index = health.get("health_index", 0)
    stressed_pct = health.get("stressed_percentage", 0)

    if health_index < 50:
        recommendations.append(
            {
                "type": "warning",
                "category": "saude",
                "message": "Indice de saude da vegetacao baixo. Recomenda-se inspecao visual da area para identificar possiveis causas (pragas, doencas, deficiencia nutricional).",
            }
        )
    elif health_index > 75:
        recommendations.append(
            {
                "type": "success",
                "category": "saude",
                "message": "Vegetacao apresenta bom indice de saude.",
            }
        )

    if stressed_pct > 20:
        recommendations.append(
            {
                "type": "alert",
                "category": "estresse",
                "message": f"Detectado {stressed_pct:.1f}% de vegetacao com sinais de estresse. Verificar irrigacao e condicoes do solo.",
            }
        )

    if not recommendations:
        recommendations.append(
            {
                "type": "info",
                "category": "geral",
                "message": "Analise concluida. Os indicadores estao dentro dos parametros normais.",
            }
        )

    return recommendations
