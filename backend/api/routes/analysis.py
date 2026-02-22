"""
Analysis Routes
Endpoints para análise de imagens (vegetação, cobertura, saúde de plantas, etc).
"""

import asyncio
import io
import logging
import os
import tempfile
import time
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

logger = logging.getLogger(__name__)

from backend.core.database import get_db
from backend.core.config import settings
from backend.models.user import User
from backend.models.project import Project
from backend.models.image import Image
from backend.models.analysis import Analysis
from backend.api.schemas.analysis import (
    AnalysisResponse,
    AnalysisListResponse,
)
from backend.api.dependencies.auth import get_current_user

# Serviços de processamento de imagens
from backend.services.image_processing import (
    run_basic_analysis,
    calculate_vegetation_coverage,
    estimate_vegetation_health,
    analyze_image_colors,
    calculate_color_histogram,
    generate_vegetation_heatmap,
    detect_vegetation_mask,
    image_to_numpy,
    numpy_to_image,
    apply_roi_mask,
)
from PIL import Image as PILImage
import numpy as np

# Serviços de Machine Learning
try:
    from backend.services.ml import (
        get_detection_summary,
        segment_by_color,
        classify_vegetation_type,
        extract_all_features,
        analyze_video,
        extract_video_keyframes,
    )
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False

# Detecção de pragas/doenças (independente de torch)
try:
    from backend.services.ml import detect_pest_disease
except ImportError:
    detect_pest_disease = None

# Estimativa de biomassa (independente de torch)
try:
    from backend.services.ml import estimate_biomass
except ImportError:
    estimate_biomass = None

# Serviço de geração de relatórios PDF
try:
    from backend.services.report_generation import ReportGenerator
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

router = APIRouter(prefix="/analysis")


async def get_user_image(
    image_id: int,
    current_user: User,
    db: AsyncSession
) -> Image:
    """Helper para buscar imagem do usuário."""
    result = await db.execute(
        select(Image)
        .where(Image.id == image_id)
        .where(Image.project.has(Project.owner_id == current_user.id))
    )
    image = result.scalar_one_or_none()

    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imagem não encontrada"
        )

    if not os.path.exists(image.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arquivo de imagem não encontrado"
        )

    return image


def is_image_file(filename: str) -> bool:
    """Verificar se é arquivo de imagem (não vídeo)."""
    ext = os.path.splitext(filename)[1].lower()
    return ext in {'.tif', '.tiff', '.jpg', '.jpeg', '.png', '.geotiff'}


@router.get("/", response_model=AnalysisListResponse)
async def list_analyses(
    image_id: Optional[int] = None,
    project_id: Optional[int] = None,
    analysis_type: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Listar análises do usuário, com filtros opcionais."""
    # Base filter - análises de imagens de projetos do usuário
    base_filter = Analysis.image.has(Image.project.has(Project.owner_id == current_user.id))

    if image_id:
        base_filter = base_filter & (Analysis.image_id == image_id)

    if project_id:
        base_filter = base_filter & Analysis.image.has(Image.project_id == project_id)

    if analysis_type:
        base_filter = base_filter & (Analysis.analysis_type == analysis_type)

    # Contar total
    count_query = select(func.count(Analysis.id)).where(base_filter)
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Buscar análises
    query = (
        select(Analysis)
        .where(base_filter)
        .offset(skip)
        .limit(limit)
        .order_by(Analysis.created_at.desc())
    )
    result = await db.execute(query)
    analyses = result.scalars().all()

    return AnalysisListResponse(analyses=analyses, total=total)


@router.post("/vegetation/{image_id}", response_model=AnalysisResponse)
async def analyze_vegetation(
    image_id: int,
    threshold: float = Query(0.3, ge=0, le=1, description="Limiar para detecção de vegetação"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Análise completa de vegetação usando Excess Green Index (ExG).

    Funciona com imagens RGB comuns (não precisa de NIR).

    Retorna:
    - Percentual de cobertura vegetal
    - Índice de saúde da vegetação
    - Estatísticas de cor
    - Histograma de cores
    """
    image = await get_user_image(image_id, current_user, db)

    if not is_image_file(image.original_filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Análise de vegetação disponível apenas para imagens (não vídeos)"
        )

    # Criar registro de análise
    analysis = Analysis(
        analysis_type="vegetation",
        status="processing",
        image_id=image_id,
        config={"threshold": threshold}
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)

    start_time = time.time()

    try:
        # Executar análise completa
        results = run_basic_analysis(image.file_path)

        # Atualizar com threshold customizado se diferente do padrão
        if threshold != 0.3:
            with PILImage.open(image.file_path) as img:
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                image_array = np.array(img)
            results['coverage'] = calculate_vegetation_coverage(image_array, threshold)

        processing_time = time.time() - start_time

        # Atualizar análise com resultados
        analysis.status = "completed"
        analysis.results = results
        analysis.processing_time_seconds = round(processing_time, 2)
        analysis.completed_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(analysis)

        return analysis

    except Exception as e:
        analysis.status = "error"
        analysis.error_message = str(e)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro na análise: {str(e)}"
        )


@router.post("/plant-health/{image_id}", response_model=AnalysisResponse)
async def analyze_plant_health(
    image_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Analisar saúde das plantas usando índices de cor RGB.

    NOTA: Esta é uma análise simplificada para imagens RGB.
    Para análise precisa, seria necessário imagens multiespectrais (NIR).

    Retorna:
    - Índice de saúde (0-100)
    - Percentual de vegetação saudável
    - Percentual de vegetação com estresse
    - Percentual de vegetação crítica
    """
    image = await get_user_image(image_id, current_user, db)

    if not is_image_file(image.original_filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Análise de saúde disponível apenas para imagens"
        )

    # Criar registro de análise
    analysis = Analysis(
        analysis_type="plant_health",
        status="processing",
        image_id=image_id,
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)

    start_time = time.time()

    try:
        # Carregar imagem
        with PILImage.open(image.file_path) as img:
            if img.mode != 'RGB':
                img = img.convert('RGB')
            image_array = np.array(img)

        # Executar análise de saúde
        health_results = estimate_vegetation_health(image_array)

        processing_time = time.time() - start_time

        # Formatar resultados
        results = {
            "health_index": health_results['health_index'],
            "healthy_percentage": health_results['healthy_percentage'],
            "moderate_percentage": health_results['moderate_percentage'],
            "stressed_percentage": health_results['stressed_percentage'],
            "non_vegetation_percentage": health_results['non_vegetation_percentage'],
            "vegetation_total_percentage": health_results['vegetation_total_percentage'],
            "mean_exg": health_results['mean_exg'],
            "mean_gli": health_results['mean_gli'],
            "classification": {
                "healthy": {"percentage": health_results['healthy_percentage']},
                "moderate": {"percentage": health_results['moderate_percentage']},
                "stressed": {"percentage": health_results['stressed_percentage']},
                "non_vegetation": {"percentage": health_results['non_vegetation_percentage']},
            }
        }

        # Atualizar análise
        analysis.status = "completed"
        analysis.results = results
        analysis.processing_time_seconds = round(processing_time, 2)
        analysis.completed_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(analysis)

        return analysis

    except Exception as e:
        analysis.status = "error"
        analysis.error_message = str(e)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro na análise: {str(e)}"
        )


@router.post("/colors/{image_id}", response_model=AnalysisResponse)
async def analyze_colors(
    image_id: int,
    bins: int = Query(32, ge=8, le=256, description="Número de bins do histograma"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Analisar distribuição de cores da imagem.

    Retorna:
    - Estatísticas por canal (R, G, B)
    - Histograma de cores
    - Brilho médio
    - Se é predominantemente verde
    """
    image = await get_user_image(image_id, current_user, db)

    if not is_image_file(image.original_filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Análise de cores disponível apenas para imagens"
        )

    # Criar registro de análise
    analysis = Analysis(
        analysis_type="colors",
        status="processing",
        image_id=image_id,
        config={"bins": bins}
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)

    start_time = time.time()

    try:
        # Carregar imagem
        with PILImage.open(image.file_path) as img:
            if img.mode != 'RGB':
                img = img.convert('RGB')
            image_array = np.array(img)

        # Executar análises
        color_stats = analyze_image_colors(image_array)
        histogram = calculate_color_histogram(image_array, bins)

        processing_time = time.time() - start_time

        results = {
            "statistics": color_stats,
            "histogram": histogram,
        }

        # Atualizar análise
        analysis.status = "completed"
        analysis.results = results
        analysis.processing_time_seconds = round(processing_time, 2)
        analysis.completed_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(analysis)

        return analysis

    except Exception as e:
        analysis.status = "error"
        analysis.error_message = str(e)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro na análise: {str(e)}"
        )


@router.post("/heatmap/{image_id}")
async def generate_heatmap(
    image_id: int,
    colormap: str = Query("green", description="Tipo de colormap: green, jet, viridis"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Gerar mapa de calor de vegetação.

    Cores:
    - green: Verde = vegetação, marrom = solo
    - jet: Gradiente vermelho-amarelo-verde
    - viridis: Gradiente azul-verde-amarelo

    Retorna a imagem do mapa de calor.
    """
    image = await get_user_image(image_id, current_user, db)

    if not is_image_file(image.original_filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Heatmap disponível apenas para imagens"
        )

    if colormap not in ['green', 'jet', 'viridis']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Colormap deve ser: green, jet ou viridis"
        )

    try:
        # Carregar imagem
        with PILImage.open(image.file_path) as img:
            if img.mode != 'RGB':
                img = img.convert('RGB')
            image_array = np.array(img)

        # Gerar heatmap
        heatmap = generate_vegetation_heatmap(image_array, colormap)

        # Salvar heatmap
        output_dir = os.path.dirname(image.file_path)
        heatmap_filename = f"{os.path.splitext(image.filename)[0]}_heatmap_{colormap}.jpg"
        heatmap_path = os.path.join(output_dir, heatmap_filename)

        heatmap_img = PILImage.fromarray(heatmap)
        heatmap_img.save(heatmap_path, 'JPEG', quality=90)

        return FileResponse(heatmap_path, media_type="image/jpeg")

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao gerar heatmap: {str(e)}"
        )


@router.post("/mask/{image_id}")
async def generate_vegetation_mask(
    image_id: int,
    threshold: float = Query(0.3, ge=0, le=1, description="Limiar para detecção"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Gerar máscara binária de vegetação.

    Retorna imagem preto/branco onde branco = vegetação.
    """
    image = await get_user_image(image_id, current_user, db)

    if not is_image_file(image.original_filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Máscara disponível apenas para imagens"
        )

    try:
        # Carregar imagem
        with PILImage.open(image.file_path) as img:
            if img.mode != 'RGB':
                img = img.convert('RGB')
            image_array = np.array(img)

        # Gerar máscara
        mask = detect_vegetation_mask(image_array, threshold)

        # Salvar máscara
        output_dir = os.path.dirname(image.file_path)
        mask_filename = f"{os.path.splitext(image.filename)[0]}_mask.png"
        mask_path = os.path.join(output_dir, mask_filename)

        mask_img = PILImage.fromarray(mask)
        mask_img.save(mask_path, 'PNG')

        return FileResponse(mask_path, media_type="image/png")

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao gerar máscara: {str(e)}"
        )


@router.get("/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(
    analysis_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obter detalhes de uma análise."""
    result = await db.execute(
        select(Analysis)
        .where(Analysis.id == analysis_id)
        .where(Analysis.image.has(Image.project.has(Project.owner_id == current_user.id)))
    )
    analysis = result.scalar_one_or_none()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Análise não encontrada"
        )

    return analysis


@router.delete("/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_analysis(
    analysis_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Excluir uma análise."""
    result = await db.execute(
        select(Analysis)
        .where(Analysis.id == analysis_id)
        .where(Analysis.image.has(Image.project.has(Project.owner_id == current_user.id)))
    )
    analysis = result.scalar_one_or_none()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Análise não encontrada"
        )

    # Remover arquivos gerados (se houver)
    if analysis.output_files:
        for file_path in analysis.output_files:
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception:
                    pass

    await db.delete(analysis)
    await db.commit()


@router.post("/report/{image_id}", response_model=AnalysisResponse)
async def generate_full_report(
    image_id: int,
    threshold: float = Query(0.3, ge=0, le=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Gerar relatório completo de análise da imagem.

    Executa todas as análises disponíveis:
    - Cobertura de vegetação
    - Saúde das plantas
    - Análise de cores
    - Histogramas
    """
    image = await get_user_image(image_id, current_user, db)

    if not is_image_file(image.original_filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Relatório disponível apenas para imagens"
        )

    # Criar registro de análise
    analysis = Analysis(
        analysis_type="full_report",
        status="processing",
        image_id=image_id,
        config={"threshold": threshold}
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)

    start_time = time.time()

    try:
        # Executar análise completa
        basic_results = run_basic_analysis(image.file_path)

        # Carregar imagem para análises adicionais
        with PILImage.open(image.file_path) as img:
            if img.mode != 'RGB':
                img = img.convert('RGB')
            image_array = np.array(img)

        # Recalcular com threshold customizado se diferente
        if threshold != 0.3:
            basic_results['coverage'] = calculate_vegetation_coverage(image_array, threshold)

        processing_time = time.time() - start_time

        # Compilar resultados
        results = {
            "image_info": {
                "filename": image.original_filename,
                "file_size_mb": round(image.file_size / 1024 / 1024, 2) if image.file_size else None,
                "dimensions": f"{basic_results['image_size']['width']}x{basic_results['image_size']['height']}",
                "gps_coordinates": {
                    "latitude": image.center_lat,
                    "longitude": image.center_lon,
                } if image.center_lat and image.center_lon else None,
                "capture_date": image.capture_date.isoformat() if image.capture_date else None,
            },
            "vegetation_coverage": basic_results['coverage'],
            "vegetation_health": basic_results['health'],
            "color_analysis": basic_results['colors'],
            "histogram": basic_results['histogram'],
            "summary": {
                "vegetation_percentage": basic_results['coverage']['vegetation_percentage'],
                "health_index": basic_results['health']['health_index'],
                "is_predominantly_green": basic_results['colors']['is_predominantly_green'],
                "brightness": round(basic_results['colors']['brightness'], 1),
            },
            "recommendations": generate_recommendations(basic_results),
        }

        # Atualizar análise
        analysis.status = "completed"
        analysis.results = results
        analysis.processing_time_seconds = round(processing_time, 2)
        analysis.completed_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(analysis)

        return analysis

    except Exception as e:
        analysis.status = "error"
        analysis.error_message = str(e)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao gerar relatório: {str(e)}"
        )


def generate_recommendations(results: dict) -> list:
    """Gerar recomendações baseadas nos resultados da análise."""
    recommendations = []

    coverage = results.get('coverage', {})
    health = results.get('health', {})

    # Recomendações baseadas em cobertura
    veg_pct = coverage.get('vegetation_percentage', 0)
    if veg_pct < 30:
        recommendations.append({
            "type": "warning",
            "category": "cobertura",
            "message": "Baixa cobertura vegetal detectada. Considere verificar a área para possíveis problemas de plantio ou erosão."
        })
    elif veg_pct > 80:
        recommendations.append({
            "type": "info",
            "category": "cobertura",
            "message": "Excelente cobertura vegetal. A área apresenta boa densidade de vegetação."
        })

    # Recomendações baseadas em saúde
    health_index = health.get('health_index', 0)
    stressed_pct = health.get('stressed_percentage', 0)

    if health_index < 50:
        recommendations.append({
            "type": "warning",
            "category": "saúde",
            "message": "Índice de saúde da vegetação baixo. Recomenda-se inspeção visual da área para identificar possíveis causas (pragas, doenças, deficiência nutricional)."
        })
    elif health_index > 75:
        recommendations.append({
            "type": "success",
            "category": "saúde",
            "message": "Vegetação apresenta bom índice de saúde."
        })

    if stressed_pct > 20:
        recommendations.append({
            "type": "alert",
            "category": "estresse",
            "message": f"Detectado {stressed_pct:.1f}% de vegetação com sinais de estresse. Verificar irrigação e condições do solo."
        })

    # Se não há recomendações, adicionar uma genérica positiva
    if not recommendations:
        recommendations.append({
            "type": "info",
            "category": "geral",
            "message": "Análise concluída. Os indicadores estão dentro dos parâmetros normais."
        })

    return recommendations


# Endpoints mantidos como placeholder para futuras implementações

@router.post("/ndvi/{image_id}", response_model=AnalysisResponse)
async def calculate_ndvi(
    image_id: int,
    threshold: float = Query(0.3, ge=0, le=1, description="Limiar para detecção de vegetação"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Calcular índice de vegetação pseudo-NDVI usando ExG (Excess Green Index).

    Como imagens RGB não possuem banda NIR, utiliza o ExG como proxy:
    ExG = 2G - R - B (normalizado)

    Retorna:
    - Mapa de índice verde (média, desvio padrão)
    - Classificação de vegetação
    - Percentuais por faixa de intensidade
    """
    image = await get_user_image(image_id, current_user, db)

    if not is_image_file(image.original_filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Análise NDVI disponível apenas para imagens"
        )

    # Criar registro de análise
    analysis = Analysis(
        analysis_type="ndvi_proxy",
        status="processing",
        image_id=image_id,
        config={"threshold": threshold}
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)

    start_time = time.time()

    try:
        # Carregar imagem
        with PILImage.open(image.file_path) as img:
            if img.mode != 'RGB':
                img = img.convert('RGB')

            # Redimensionar se muito grande
            max_size = 2000
            if max(img.size) > max_size:
                ratio = max_size / max(img.size)
                new_size = (int(img.width * ratio), int(img.height * ratio))
                img = img.resize(new_size, PILImage.Resampling.LANCZOS)

            image_array = np.array(img, dtype=np.float32) / 255.0

        r, g, b = image_array[:, :, 0], image_array[:, :, 1], image_array[:, :, 2]

        # Calcular ExG (Excess Green Index) como proxy NDVI
        total = r + g + b + 1e-10
        exg = (2.0 * g - r - b) / total
        # Normalizar de [-1, 1] para [0, 1]
        exg_norm = (exg + 1.0) / 2.0

        # Estatísticas
        mean_exg = float(np.mean(exg_norm))
        std_exg = float(np.std(exg_norm))
        min_exg = float(np.min(exg_norm))
        max_exg = float(np.max(exg_norm))

        # Classificação por faixas de intensidade
        total_pixels = exg_norm.size
        very_low = float(np.sum(exg_norm < 0.3) / total_pixels * 100)
        low = float(np.sum((exg_norm >= 0.3) & (exg_norm < 0.45)) / total_pixels * 100)
        moderate = float(np.sum((exg_norm >= 0.45) & (exg_norm < 0.55)) / total_pixels * 100)
        high = float(np.sum((exg_norm >= 0.55) & (exg_norm < 0.65)) / total_pixels * 100)
        very_high = float(np.sum(exg_norm >= 0.65) / total_pixels * 100)

        # Classificação geral
        if mean_exg >= 0.6:
            classification = "vegetação densa"
        elif mean_exg >= 0.5:
            classification = "vegetação moderada"
        elif mean_exg >= 0.4:
            classification = "vegetação esparsa"
        else:
            classification = "pouca vegetação"

        processing_time = time.time() - start_time

        results = {
            "method": "ExG (Excess Green Index) - proxy RGB para NDVI",
            "statistics": {
                "mean": round(mean_exg, 4),
                "std": round(std_exg, 4),
                "min": round(min_exg, 4),
                "max": round(max_exg, 4),
            },
            "classification": classification,
            "intensity_bands": {
                "very_low_pct": round(very_low, 2),
                "low_pct": round(low, 2),
                "moderate_pct": round(moderate, 2),
                "high_pct": round(high, 2),
                "very_high_pct": round(very_high, 2),
            },
            "vegetation_percentage": round(high + very_high, 2),
            "note": "Valores baseados em ExG (proxy RGB). Para NDVI real, são necessárias imagens multiespectrais com banda NIR.",
        }

        # Atualizar análise
        analysis.status = "completed"
        analysis.results = results
        analysis.processing_time_seconds = round(processing_time, 2)
        analysis.completed_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(analysis)

        return analysis

    except Exception as e:
        analysis.status = "error"
        analysis.error_message = str(e)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro na análise NDVI: {str(e)}"
        )


@router.post("/classify/{image_id}", response_model=AnalysisResponse)
async def classify_land_use(
    image_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Classificar uso do solo na imagem usando análise de cores.

    Retorna percentuais de:
    - Vegetação
    - Solo exposto
    - Água
    - Construções/estradas
    - Sombras
    """
    if not ML_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Serviços de ML não disponíveis. Instale as dependências necessárias.",
        )

    image = await get_user_image(image_id, current_user, db)

    if not is_image_file(image.original_filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Classificação disponível apenas para imagens"
        )

    # Criar registro de análise
    analysis = Analysis(
        analysis_type="land_classification",
        status="processing",
        image_id=image_id,
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)

    start_time = time.time()

    try:
        # Carregar imagem
        with PILImage.open(image.file_path) as img:
            if img.mode != 'RGB':
                img = img.convert('RGB')

            # Redimensionar para processamento mais rápido
            max_size = 1500
            if max(img.size) > max_size:
                ratio = max_size / max(img.size)
                new_size = (int(img.width * ratio), int(img.height * ratio))
                img = img.resize(new_size, PILImage.Resampling.LANCZOS)

            image_array = np.array(img)

        # Executar segmentação por cor
        segmentation = segment_by_color(image_array)

        # Classificar tipo de vegetação
        veg_type = classify_vegetation_type(image.file_path)

        processing_time = time.time() - start_time

        results = {
            "land_use_percentages": segmentation,
            "vegetation_classification": veg_type,
            "summary": {
                "total_vegetation": segmentation.get('vegetacao', 0),
                "total_non_vegetation": 100 - segmentation.get('vegetacao', 0),
                "vegetation_type": veg_type.get('vegetation_type', 'unknown'),
                "vegetation_density": veg_type.get('vegetation_density', 'unknown'),
            }
        }

        # Atualizar análise
        analysis.status = "completed"
        analysis.results = results
        analysis.processing_time_seconds = round(processing_time, 2)
        analysis.completed_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(analysis)

        return analysis

    except Exception as e:
        analysis.status = "error"
        analysis.error_message = str(e)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro na classificação: {str(e)}"
        )


@router.post("/plant-count/{image_id}", response_model=AnalysisResponse)
async def count_plants(
    image_id: int,
    min_area: int = Query(50, ge=10, le=5000, description="Área mínima em pixels para considerar como planta"),
    max_area: int = Query(15000, ge=100, le=100000, description="Área máxima em pixels"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Contar número de plantas/árvores na imagem usando segmentação ExG.

    Algoritmo:
    1. Calcula ExG (Excess Green) para identificar vegetação
    2. Aplica threshold automático (percentil 70)
    3. Usa operações morfológicas para separar plantas
    4. Conta componentes conectados como plantas individuais

    Retorna:
    - Contagem total
    - Localizações (bbox, centróide)
    - Estatísticas de área
    """
    image = await get_user_image(image_id, current_user, db)

    if not is_image_file(image.original_filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contagem de plantas disponível apenas para imagens"
        )

    # Criar registro de análise
    analysis = Analysis(
        analysis_type="plant_count",
        status="processing",
        image_id=image_id,
        config={"min_area": min_area, "max_area": max_area}
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)

    start_time = time.time()

    try:
        from backend.services.ml.tree_counter import count_trees_by_segmentation

        # Executar contagem
        count_results = count_trees_by_segmentation(
            image.file_path,
            min_tree_area=min_area,
            max_tree_area=max_area,
        )

        processing_time = time.time() - start_time

        results = {
            "total_count": count_results['total_trees'],
            "total_area_pixels": count_results['total_tree_area_pixels'],
            "coverage_percentage": count_results['coverage_percentage'],
            "statistics": {
                "avg_area": count_results['avg_tree_area'],
                "min_area": count_results['min_tree_area'],
                "max_area": count_results['max_tree_area'],
            },
            "locations": count_results['trees'],
            "image_dimensions": count_results['image_dimensions'],
            "parameters": count_results['parameters'],
        }

        # Atualizar análise
        analysis.status = "completed"
        analysis.results = results
        analysis.processing_time_seconds = round(processing_time, 2)
        analysis.completed_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(analysis)

        return analysis

    except Exception as e:
        analysis.status = "error"
        analysis.error_message = str(e)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro na contagem de plantas: {str(e)}"
        )


@router.post("/detect/{image_id}", response_model=AnalysisResponse)
async def detect_objects(
    image_id: int,
    confidence: float = Query(0.25, ge=0.1, le=0.9, description="Limiar de confiança"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Detectar objetos na imagem usando YOLOv8.

    Detecta objetos comuns como: pessoas, veículos, animais, etc.
    NOTA: Modelo treinado para fotos de solo, pode ter baixa acurácia em imagens aéreas.
    """
    if not ML_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Serviços de ML não disponíveis.",
        )

    image = await get_user_image(image_id, current_user, db)

    if not is_image_file(image.original_filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Detecção disponível apenas para imagens"
        )

    # Criar registro de análise
    analysis = Analysis(
        analysis_type="object_detection",
        status="processing",
        image_id=image_id,
        config={"confidence": confidence}
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)

    start_time = time.time()

    try:
        # Executar detecção
        detection_results = get_detection_summary(image.file_path, confidence)

        processing_time = time.time() - start_time

        results = {
            "detections": detection_results,
            "note": "Modelo YOLO treinado para fotos de solo. Para imagens aéreas, considere usar modelo especializado.",
        }

        # Atualizar análise
        analysis.status = "completed"
        analysis.results = results
        analysis.processing_time_seconds = round(processing_time, 2)
        analysis.completed_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(analysis)

        return analysis

    except Exception as e:
        analysis.status = "error"
        analysis.error_message = str(e)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro na detecção: {str(e)}"
        )


@router.post("/pest-disease/{image_id}", response_model=AnalysisResponse)
async def detect_pests(
    image_id: int,
    anomaly_threshold: float = Query(2.0, ge=0.5, le=5.0),
    min_region_area: int = Query(100, ge=10, le=10000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Detectar pragas e doencas na vegetacao.

    Analisa sintomas visuais usando cor (HSV) e textura:
    - Clorose (amarelecimento): deficiencia nutricional
    - Necrose (manchas marrons): tecido morto
    - Anomalias de textura: danos por insetos ou estresse

    Retorna taxa de infeccao, severidade e regioes afetadas.
    """
    if detect_pest_disease is None:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Servico de deteccao de pragas nao disponivel.",
        )

    image = await get_user_image(image_id, current_user, db)

    if not is_image_file(image.original_filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Deteccao de pragas disponivel apenas para imagens"
        )

    # Criar registro de analise
    analysis = Analysis(
        analysis_type="pest_disease",
        status="processing",
        image_id=image_id,
        config={"anomaly_threshold": anomaly_threshold, "min_region_area": min_region_area}
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)

    start_time = time.time()

    try:
        # Executar deteccao em thread separada
        pest_results = await asyncio.to_thread(
            detect_pest_disease,
            image.file_path,
            anomaly_threshold,
            min_region_area,
        )

        processing_time = time.time() - start_time

        # Atualizar analise
        analysis.status = "completed"
        analysis.results = pest_results
        analysis.processing_time_seconds = round(processing_time, 2)
        analysis.completed_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(analysis)

        return analysis

    except Exception as e:
        analysis.status = "error"
        analysis.error_message = str(e)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro na deteccao de pragas: {str(e)}"
        )


@router.post("/biomass/{image_id}", response_model=AnalysisResponse)
async def estimate_biomass_endpoint(
    image_id: int,
    min_canopy_area: int = Query(50, ge=10, le=5000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Estimar biomassa vegetal na imagem.

    Analisa cobertura vegetal, copas individuais e vigor para
    calcular um indice de biomassa (0-100) e estimativa em kg/ha.

    Retorna indice de biomassa, classe de densidade, copas detectadas
    e metricas de vigor.
    """
    if estimate_biomass is None:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Servico de estimativa de biomassa nao disponivel.",
        )

    image = await get_user_image(image_id, current_user, db)

    if not is_image_file(image.original_filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Estimativa de biomassa disponivel apenas para imagens"
        )

    # Criar registro de analise
    analysis = Analysis(
        analysis_type="biomass",
        status="processing",
        image_id=image_id,
        config={"min_canopy_area": min_canopy_area}
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)

    start_time = time.time()

    try:
        # Executar estimativa em thread separada
        biomass_results = await asyncio.to_thread(
            estimate_biomass,
            image.file_path,
            min_canopy_area,
        )

        processing_time = time.time() - start_time

        # Atualizar analise
        analysis.status = "completed"
        analysis.results = biomass_results
        analysis.processing_time_seconds = round(processing_time, 2)
        analysis.completed_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(analysis)

        return analysis

    except Exception as e:
        analysis.status = "error"
        analysis.error_message = str(e)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro na estimativa de biomassa: {str(e)}"
        )


@router.post("/features/{image_id}", response_model=AnalysisResponse)
async def extract_features(
    image_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Extrair todas as características visuais da imagem.

    Inclui:
    - Características de textura
    - Características de cor
    - Padrões detectados (linhas, círculos)
    - Anomalias visuais
    """
    if not ML_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Serviços de ML não disponíveis.",
        )

    image = await get_user_image(image_id, current_user, db)

    if not is_image_file(image.original_filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Extração de características disponível apenas para imagens"
        )

    # Criar registro de análise
    analysis = Analysis(
        analysis_type="feature_extraction",
        status="processing",
        image_id=image_id,
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)

    start_time = time.time()

    try:
        # Extrair características
        features = extract_all_features(image.file_path)

        processing_time = time.time() - start_time

        # Atualizar análise
        analysis.status = "completed"
        analysis.results = features
        analysis.processing_time_seconds = round(processing_time, 2)
        analysis.completed_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(analysis)

        return analysis

    except Exception as e:
        analysis.status = "error"
        analysis.error_message = str(e)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro na extração: {str(e)}"
        )


@router.post("/full/{image_id}", response_model=AnalysisResponse)
async def full_ml_analysis(
    image_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Análise completa com Machine Learning.

    Executa todas as análises disponíveis:
    - Análise de vegetação (ExG, GLI)
    - Classificação de uso do solo
    - Classificação de vegetação
    - Extração de características
    - Detecção de padrões

    NOTA: Pode demorar 30-60 segundos por imagem.
    """
    if not ML_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Serviços de ML não disponíveis.",
        )

    image = await get_user_image(image_id, current_user, db)

    if not is_image_file(image.original_filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Análise completa disponível apenas para imagens"
        )

    # Criar registro de análise
    analysis = Analysis(
        analysis_type="full_ml_analysis",
        status="processing",
        image_id=image_id,
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)

    start_time = time.time()

    try:
        # Carregar imagem uma vez
        with PILImage.open(image.file_path) as img:
            if img.mode != 'RGB':
                img = img.convert('RGB')

            # Redimensionar para processamento
            max_size = 1200
            original_size = img.size
            if max(img.size) > max_size:
                ratio = max_size / max(img.size)
                new_size = (int(img.width * ratio), int(img.height * ratio))
                img_resized = img.resize(new_size, PILImage.Resampling.LANCZOS)
            else:
                img_resized = img

            image_array = np.array(img_resized)

        # 1. Análise básica de vegetação
        basic_results = run_basic_analysis(image.file_path)

        # 2. Segmentação por cor
        segmentation = segment_by_color(image_array)

        # 3. Classificação de vegetação
        veg_classification = classify_vegetation_type(image.file_path)

        # 4. Extração de características (simplificada para performance)
        from backend.services.ml.feature_extractor import (
            extract_texture_features,
            extract_color_features,
        )
        texture = extract_texture_features(image_array)
        colors = extract_color_features(image_array)

        processing_time = time.time() - start_time

        # Compilar resultados
        results = {
            "image_info": {
                "filename": image.original_filename,
                "original_size": f"{original_size[0]}x{original_size[1]}",
                "gps": {
                    "latitude": image.center_lat,
                    "longitude": image.center_lon,
                } if image.center_lat and image.center_lon else None,
            },
            "vegetation_analysis": {
                "coverage": basic_results.get('coverage', {}),
                "health": basic_results.get('health', {}),
            },
            "land_use": segmentation,
            "vegetation_type": veg_classification,
            "visual_features": {
                "texture": texture,
                "colors": colors,
            },
            "summary": {
                "vegetation_percentage": basic_results.get('coverage', {}).get('vegetation_percentage', 0),
                "health_index": basic_results.get('health', {}).get('health_index', 0),
                "dominant_land_use": max(segmentation, key=segmentation.get) if segmentation else 'unknown',
                "vegetation_type": veg_classification.get('vegetation_type', 'unknown'),
                "texture_type": texture.get('texture_type', 'unknown'),
                "dominant_color": colors.get('dominant_color', 'unknown'),
            },
            "processing_time_seconds": round(processing_time, 2),
        }

        # Atualizar análise
        analysis.status = "completed"
        analysis.results = results
        analysis.processing_time_seconds = round(processing_time, 2)
        analysis.completed_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(analysis)

        return analysis

    except Exception as e:
        analysis.status = "error"
        analysis.error_message = str(e)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro na análise: {str(e)}"
        )


# ============================================
# ENDPOINTS DE VÍDEO
# ============================================

def is_video_file_check(filename: str) -> bool:
    """Verificar se é arquivo de vídeo."""
    ext = os.path.splitext(filename)[1].lower()
    return ext in {'.mov', '.mp4', '.avi', '.mkv', '.wmv', '.flv'}


@router.post("/video/{image_id}", response_model=AnalysisResponse)
async def analyze_video_endpoint(
    image_id: int,
    sample_rate: int = Query(30, ge=1, le=120, description="Taxa de amostragem em frames"),
    max_frames: int = Query(50, ge=5, le=200, description="Máximo de frames a analisar"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Analisar vídeo de drone completo.

    Extrai frames, executa análises de vegetação e gera resumo temporal.
    """
    if not ML_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Serviços de ML não disponíveis.",
        )

    image = await get_user_image(image_id, current_user, db)

    if not is_video_file_check(image.original_filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este endpoint é para vídeos. Use outros endpoints para imagens."
        )

    # Criar registro de análise
    analysis = Analysis(
        analysis_type="video_analysis",
        status="processing",
        image_id=image_id,
        config={"sample_rate": sample_rate, "max_frames": max_frames}
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)

    start_time = time.time()

    try:
        # Executar análise de vídeo
        video_results = analyze_video(
            image.file_path,
            sample_rate=sample_rate,
            max_frames=max_frames
        )

        processing_time = time.time() - start_time

        # Preparar resultados
        results = {
            "video_info": video_results['video_info'],
            "key_frames": video_results['key_frames'],
            "frames_analyzed": video_results['frame_count_analyzed'],
            "temporal_summary": video_results['temporal_summary'],
            "mosaic_path": video_results.get('mosaic_path'),
        }

        # Atualizar análise
        analysis.status = "completed"
        analysis.results = results
        analysis.processing_time_seconds = round(processing_time, 2)
        analysis.completed_at = datetime.now(timezone.utc)

        if video_results.get('mosaic_path'):
            analysis.output_files = [video_results['mosaic_path']]

        await db.commit()
        await db.refresh(analysis)

        return analysis

    except Exception as e:
        analysis.status = "error"
        analysis.error_message = str(e)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro na análise de vídeo: {str(e)}"
        )


@router.post("/video/{image_id}/keyframes", response_model=AnalysisResponse)
async def extract_keyframes_endpoint(
    image_id: int,
    num_frames: int = Query(10, ge=1, le=50, description="Número de key frames"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Extrair key frames de um vídeo.

    Retorna frames distribuídos uniformemente ao longo do vídeo.
    """
    if not ML_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Serviços de ML não disponíveis.",
        )

    image = await get_user_image(image_id, current_user, db)

    if not is_video_file_check(image.original_filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este endpoint é para vídeos."
        )

    # Criar registro de análise
    analysis = Analysis(
        analysis_type="video_keyframes",
        status="processing",
        image_id=image_id,
        config={"num_frames": num_frames}
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)

    start_time = time.time()

    try:
        # Extrair key frames
        key_frames = extract_video_keyframes(image.file_path, num_frames)

        processing_time = time.time() - start_time

        # Coletar caminhos dos frames
        frame_paths = [kf.get('path') for kf in key_frames if kf.get('path')]

        results = {
            "key_frames": key_frames,
            "total_extracted": len(key_frames),
        }

        # Atualizar análise
        analysis.status = "completed"
        analysis.results = results
        analysis.processing_time_seconds = round(processing_time, 2)
        analysis.completed_at = datetime.now(timezone.utc)
        analysis.output_files = frame_paths

        await db.commit()
        await db.refresh(analysis)

        return analysis

    except Exception as e:
        analysis.status = "error"
        analysis.error_message = str(e)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro na extração de key frames: {str(e)}"
        )


@router.get("/video/{image_id}/mosaic")
async def get_video_mosaic(
    image_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obter mosaico de frames do vídeo.

    Retorna imagem JPEG com grid de frames representativos.
    """
    image = await get_user_image(image_id, current_user, db)

    if not is_video_file_check(image.original_filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este endpoint é para vídeos."
        )

    # Procurar mosaico existente
    output_dir = os.path.dirname(image.file_path)
    video_name = os.path.splitext(image.filename)[0]
    mosaic_path = os.path.join(output_dir, f"{video_name}_mosaic.jpg")

    if os.path.exists(mosaic_path):
        return FileResponse(mosaic_path, media_type="image/jpeg")

    # Se não existe, gerar
    if not ML_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Serviços de ML não disponíveis.",
        )

    try:
        from backend.services.ml import get_video_analyzer
        analyzer = get_video_analyzer()

        # Extrair frames e criar mosaico
        key_frames = analyzer.extract_key_frames(image.file_path, num_frames=16)

        frames = []
        for kf in key_frames:
            if kf.get('path') and os.path.exists(kf['path']):
                frames.append(np.array(PILImage.open(kf['path'])))

        if frames:
            mosaic = analyzer.create_mosaic(frames)
            PILImage.fromarray(mosaic).save(mosaic_path, 'JPEG', quality=90)
            return FileResponse(mosaic_path, media_type="image/jpeg")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Não foi possível gerar o mosaico"
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao gerar mosaico: {str(e)}"
        )


# ============================================
# ENDPOINT ROI (Region of Interest)
# ============================================


class ROIRequest(BaseModel):
    roi_polygon: list[list[float]] = Field(..., min_length=3)
    analyses: list[str] = Field(
        default=["vegetation", "health", "plant_count"],
        description="Análises a executar dentro do ROI",
    )


@router.post("/roi/{image_id}", response_model=AnalysisResponse)
async def analyze_roi(
    image_id: int,
    body: ROIRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Analisar uma Região de Interesse (ROI) na imagem.

    Desenhe um polígono sobre a imagem e execute análises somente dentro do perímetro.
    """
    image = await get_user_image(image_id, current_user, db)

    if not is_image_file(image.original_filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Análise ROI disponível apenas para imagens",
        )

    if len(body.roi_polygon) < 3:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Polígono ROI precisa de pelo menos 3 pontos",
        )

    # Criar registro de análise
    analysis = Analysis(
        analysis_type="roi_analysis",
        status="processing",
        image_id=image_id,
        config={"roi_polygon": body.roi_polygon, "analyses": body.analyses},
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)

    start_time = time.time()
    tmp_path = None

    try:
        # Aplicar máscara ROI
        masked_array, roi_metadata = await asyncio.to_thread(
            apply_roi_mask, image.file_path, body.roi_polygon
        )

        # Salvar imagem mascarada em temp file
        masked_img = PILImage.fromarray(masked_array)
        tmp_fd, tmp_path = tempfile.mkstemp(suffix=".jpg")
        os.close(tmp_fd)
        masked_img.save(tmp_path, "JPEG", quality=90)

        results: dict = {"roi_metadata": roi_metadata}

        # Executar análises selecionadas na imagem mascarada
        if "vegetation" in body.analyses:
            try:
                basic = await asyncio.to_thread(run_basic_analysis, tmp_path)
                results["vegetation"] = basic.get("coverage", {})
            except Exception as e:
                results["vegetation"] = {"error": str(e)}

        if "health" in body.analyses:
            try:
                health = await asyncio.to_thread(estimate_vegetation_health, masked_array)
                results["health"] = health
            except Exception as e:
                results["health"] = {"error": str(e)}

        if "plant_count" in body.analyses:
            try:
                from backend.services.ml.tree_counter import count_trees_by_segmentation
                count = await asyncio.to_thread(count_trees_by_segmentation, tmp_path)
                results["plant_count"] = {
                    "total_count": count["total_trees"],
                    "coverage_percentage": count["coverage_percentage"],
                    "trees": count["trees"],
                }
            except Exception as e:
                results["plant_count"] = {"error": str(e)}

        if "pest_disease" in body.analyses and detect_pest_disease is not None:
            try:
                pest = await asyncio.to_thread(detect_pest_disease, tmp_path)
                results["pest_disease"] = pest
            except Exception as e:
                results["pest_disease"] = {"error": str(e)}

        if "biomass" in body.analyses and estimate_biomass is not None:
            try:
                bio = await asyncio.to_thread(estimate_biomass, tmp_path)
                results["biomass"] = bio
            except Exception as e:
                results["biomass"] = {"error": str(e)}

        processing_time = time.time() - start_time

        analysis.status = "completed"
        analysis.results = results
        analysis.processing_time_seconds = round(processing_time, 2)
        analysis.completed_at = datetime.now(timezone.utc)

        # Salvar imagem mascarada como imagem principal (sobrescreve original)
        try:
            masked_img.save(image.file_path, "JPEG", quality=95)
            # Atualizar dimensões da imagem no DB se mudaram
            if masked_img.size[0] != image.width or masked_img.size[1] != image.height:
                image.width = masked_img.size[0]
                image.height = masked_img.size[1]
            # Deletar thumbnail para forçar regeneração
            thumb_dir = os.path.join(os.path.dirname(image.file_path), "thumbnails")
            thumb_path = os.path.join(thumb_dir, os.path.basename(image.file_path))
            if os.path.exists(thumb_path):
                os.remove(thumb_path)
        except Exception as save_err:
            logger.warning("Falha ao salvar imagem mascarada como principal: %s", save_err)

        # Atualizar status do projeto para completed
        project_result = await db.execute(
            select(Project).where(Project.id == image.project_id)
        )
        project = project_result.scalar_one_or_none()
        if project:
            project.status = "completed"

        await db.commit()
        await db.refresh(analysis)

        return analysis

    except Exception as e:
        analysis.status = "error"
        analysis.error_message = str(e)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro na análise ROI: {str(e)}",
        )
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass


# ============================================
# ENDPOINT OVERLAY (Trees / Pests / Water)
# ============================================


@router.get("/overlay/{image_id}")
async def get_analysis_overlay(
    image_id: int,
    overlay_type: str = Query(..., description="Tipo: trees, pests, water"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Gerar overlay PNG RGBA transparente para uma imagem analisada.

    Usa dados já existentes do full_report (não re-analisa).
    """
    image = await get_user_image(image_id, current_user, db)

    if overlay_type not in ("trees", "pests", "water"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="overlay_type deve ser: trees, pests ou water",
        )

    # Buscar análise full_report ou específica
    result = await db.execute(
        select(Analysis)
        .where(Analysis.image_id == image_id)
        .where(
            Analysis.image.has(Image.project.has(Project.owner_id == current_user.id))
        )
        .where(Analysis.status == "completed")
        .order_by(Analysis.completed_at.desc())
    )
    analyses = result.scalars().all()

    if not analyses:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhuma análise completada encontrada para esta imagem",
        )

    # Dimensões da imagem
    img_w = image.width or 800
    img_h = image.height or 600

    # Encontrar dados relevantes
    overlay_data = None
    for a in analyses:
        r = a.results or {}
        if overlay_type == "trees":
            # Procurar em full_report ou plant_count
            if "plant_count" in r and "locations" in r["plant_count"]:
                overlay_data = {"trees": r["plant_count"]["locations"]}
                break
            if "tree_count" in r and "trees" in r["tree_count"]:
                overlay_data = {"trees": r["tree_count"]["trees"]}
                break
            if a.analysis_type == "plant_count" and "locations" in r:
                overlay_data = {"trees": r["locations"]}
                break
        elif overlay_type == "pests":
            if "pest_disease" in r and "affected_regions" in r.get("pest_disease", {}):
                overlay_data = {"regions": r["pest_disease"]["affected_regions"]}
                break
            if a.analysis_type == "pest_disease" and "affected_regions" in r:
                overlay_data = {"regions": r["affected_regions"]}
                break
        elif overlay_type == "water":
            if "land_use" in r:
                water_pct = r["land_use"].get("agua", r["land_use"].get("water", 0))
                if water_pct > 0:
                    overlay_data = {"water_percentage": water_pct}
                    break

    if overlay_data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dados de overlay '{overlay_type}' não encontrados nas análises",
        )

    # Gerar overlay PNG RGBA
    try:
        overlay = np.zeros((img_h, img_w, 4), dtype=np.uint8)

        if overlay_type == "trees":
            trees = overlay_data.get("trees", [])
            for tree in trees:
                center = tree.get("center")
                if not center:
                    continue
                cx, cy = int(center[0]), int(center[1])
                radius = max(5, int(tree.get("area", 200) ** 0.5 / 2))
                # Desenhar círculo verde
                _draw_circle(overlay, cx, cy, radius, (34, 197, 94, 160))

        elif overlay_type == "pests":
            regions = overlay_data.get("regions", [])
            for region in regions:
                bbox = region.get("bbox")
                if not bbox or len(bbox) < 4:
                    continue
                x1, y1, x2, y2 = int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])
                x1 = max(0, min(x1, img_w - 1))
                y1 = max(0, min(y1, img_h - 1))
                x2 = max(0, min(x2, img_w - 1))
                y2 = max(0, min(y2, img_h - 1))
                overlay[y1:y2, x1:x2] = [239, 68, 68, 120]  # vermelho semi-transparente

        elif overlay_type == "water":
            # Overlay azul simples (placeholder — dados completos precisariam de segmentação pixel-level)
            overlay[:, :] = [59, 130, 246, 40]  # azul muito sutil como base

        overlay_img = PILImage.fromarray(overlay, "RGBA")
        buf = io.BytesIO()
        overlay_img.save(buf, format="PNG")
        buf.seek(0)

        return Response(
            content=buf.getvalue(),
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=300"},
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao gerar overlay: {str(e)}",
        )


def _draw_circle(img: np.ndarray, cx: int, cy: int, radius: int, color: tuple):
    """Desenha círculo preenchido em array RGBA."""
    h, w = img.shape[:2]
    y_min = max(0, cy - radius)
    y_max = min(h, cy + radius + 1)
    x_min = max(0, cx - radius)
    x_max = min(w, cx + radius + 1)

    for y in range(y_min, y_max):
        for x in range(x_min, x_max):
            if (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2:
                img[y, x] = color


# ============================================
# ENDPOINT DE EXPORTAÇÃO PDF
# ============================================

@router.get("/export/pdf/{analysis_id}")
async def export_analysis_pdf(
    analysis_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Exportar análise como relatório PDF.

    Gera PDF com todas as informações da análise, incluindo gráficos e recomendações.
    """
    if not PDF_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Serviço de geração de PDF não disponível.",
        )

    # Buscar análise
    result = await db.execute(
        select(Analysis)
        .where(Analysis.id == analysis_id)
        .where(Analysis.image.has(Image.project.has(Project.owner_id == current_user.id)))
    )
    analysis = result.scalar_one_or_none()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Análise não encontrada"
        )

    if analysis.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Análise ainda não foi concluída"
        )

    # Buscar imagem e projeto relacionados
    image_result = await db.execute(
        select(Image).where(Image.id == analysis.image_id)
    )
    image = image_result.scalar_one_or_none()

    project = None
    enriched_data = None
    all_analyses = None
    if image:
        project_result = await db.execute(
            select(Project).where(Project.id == image.project_id)
        )
        project = project_result.scalar_one_or_none()

        # Buscar todas as analises do projeto
        all_analyses_result = await db.execute(
            select(Analysis)
            .where(Analysis.image.has(Image.project_id == image.project_id))
            .where(Analysis.status == "completed")
        )
        all_analyses = all_analyses_result.scalars().all()

        # Buscar dados enriquecidos (se existirem)
        if project:
            try:
                enriched_result = await db.execute(
                    select(Analysis)
                    .where(Analysis.image.has(Image.project_id == project.id))
                    .where(Analysis.analysis_type == "enriched_data")
                    .where(Analysis.status == "completed")
                    .order_by(Analysis.completed_at.desc())
                )
                enriched_analysis = enriched_result.scalars().first()
                if enriched_analysis and enriched_analysis.results:
                    enriched_data = enriched_analysis.results
            except Exception:
                pass  # Ignorar erros ao buscar dados enriquecidos

    try:
        # Gerar PDF
        generator = ReportGenerator()
        pdf_bytes = generator.generate(
            analysis=analysis,
            project=project,
            image=image,
            enriched_data=enriched_data,
            all_analyses=all_analyses
        )

        # Preparar nome do arquivo
        project_name = project.name if project else "Roboroca"
        safe_name = "".join(c for c in project_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
        filename = f"relatorio_{safe_name}_{analysis.id}.pdf"

        # Retornar PDF
        from fastapi.responses import Response
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao gerar PDF: {str(e)}"
        )
