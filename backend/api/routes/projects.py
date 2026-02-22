"""
Projects Routes
Endpoints para gerenciamento de projetos (fazendas/propriedades).
"""

from typing import Optional
import asyncio
import logging
import os
import time
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from backend.core.database import get_db, async_session_maker
from backend.models.user import User
from backend.models.project import Project
from backend.models.image import Image
from backend.models.analysis import Analysis
from backend.api.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectListResponse,
)
from backend.api.dependencies.auth import get_current_user

# Importar serviços de análise
from backend.services.image_processing import run_basic_analysis

# Importar contagem de árvores (independente de YOLO/torch)
try:
    from backend.services.ml.tree_counter import count_trees_by_segmentation
    logger.info("count_trees_by_segmentation loaded: %s", count_trees_by_segmentation is not None)
except ImportError as e:
    count_trees_by_segmentation = None
    logger.warning("count_trees_by_segmentation failed to import: %s", e)

# Importar detecção de pragas/doenças (independente de YOLO/torch)
try:
    from backend.services.ml.pest_detector import detect_pest_disease
except ImportError:
    detect_pest_disease = None

# Importar estimativa de biomassa (independente de YOLO/torch)
try:
    from backend.services.ml.biomass_estimator import estimate_biomass
except ImportError:
    estimate_biomass = None

# Importar outros serviços ML (com tratamento de erro)
try:
    from backend.services.ml import (
        segment_image,
        classify_scene,
        classify_vegetation_type,
        extract_all_features,
        get_detection_summary,
        analyze_video,
    )
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    segment_image = None
    classify_scene = None
    classify_vegetation_type = None
    extract_all_features = None
    get_detection_summary = None
    analyze_video = None

from backend.utils.files import is_image_file, is_video_file

router = APIRouter(prefix="/projects")


async def run_image_full_analysis(image, analysis, db):
    """
    Executar análise completa (básica + ML) para uma imagem.

    Cada etapa ML é protegida individualmente para que falhas
    parciais não impeçam as outras análises.
    """
    start_time = time.time()

    try:
        # 1. Análise básica: vegetação (ExG) + cores + histograma
        # Usar asyncio.to_thread para não bloquear o event loop
        results = await asyncio.to_thread(run_basic_analysis, image.file_path)
        processing_time = time.time() - start_time

        # Compilar resultados básicos
        analysis_results = {
            "image_info": {
                "filename": image.original_filename,
                "file_size_mb": round(image.file_size / 1024 / 1024, 2) if image.file_size else None,
                "dimensions": f"{results['image_size']['width']}x{results['image_size']['height']}",
                "gps_coordinates": {
                    "latitude": image.center_lat,
                    "longitude": image.center_lon,
                } if image.center_lat and image.center_lon else None,
                "capture_date": image.capture_date.isoformat() if image.capture_date else None,
            },
            "vegetation_coverage": results['coverage'],
            "vegetation_health": results['health'],
            "color_analysis": results['colors'],
            "histogram": results['histogram'],
            "summary": {
                "vegetation_percentage": results['coverage']['vegetation_percentage'],
                "health_index": results['health']['health_index'],
                "is_predominantly_green": results['colors']['is_predominantly_green'],
                "brightness": round(results['colors']['brightness'], 1),
            },
        }

        # 2. Análises ML adicionais (cada uma protegida individualmente)
        ml_errors = []

        if ML_AVAILABLE:
            # 2a. Segmentação DeepLabV3
            if segment_image is not None:
                try:
                    segmentation = await asyncio.to_thread(segment_image, image.file_path)
                    analysis_results["segmentation"] = segmentation
                except Exception as e:
                    ml_errors.append(f"segmentation: {e}")

            # 2b. Classificação de cena ResNet18
            if classify_scene is not None:
                try:
                    scene = await asyncio.to_thread(classify_scene, image.file_path)
                    analysis_results["scene_classification"] = scene
                except Exception as e:
                    ml_errors.append(f"scene_classification: {e}")

            # 2c. Classificação de tipo de vegetação
            if classify_vegetation_type is not None:
                try:
                    veg_type = await asyncio.to_thread(classify_vegetation_type, image.file_path)
                    analysis_results["vegetation_type"] = veg_type
                except Exception as e:
                    ml_errors.append(f"vegetation_type: {e}")

            # 2d. Extração de features (textura, cor, padrões, anomalias)
            if extract_all_features is not None:
                try:
                    features = await asyncio.to_thread(extract_all_features, image.file_path)
                    analysis_results["visual_features"] = features
                except Exception as e:
                    ml_errors.append(f"features: {e}")

            # 2e. Detecção YOLO (mais lenta, por último)
            if get_detection_summary is not None:
                try:
                    detections = await asyncio.to_thread(get_detection_summary, image.file_path)
                    analysis_results["object_detection"] = detections
                except Exception as e:
                    ml_errors.append(f"object_detection: {e}")

        if ml_errors:
            analysis_results["ml_errors"] = ml_errors

        # 3. Contagem de árvores por segmentação (SEMPRE executar - independente de ML)
        if count_trees_by_segmentation is not None:
            try:
                tree_count = await asyncio.to_thread(count_trees_by_segmentation, image.file_path)
                analysis_results["tree_count"] = tree_count

                # Atualizar object_detection com contagem de árvores se não houver detecções YOLO
                if "object_detection" not in analysis_results or analysis_results["object_detection"].get("total_detections", 0) == 0:
                    # Usar contagem de árvores como principal fonte de detecções
                    analysis_results["object_detection"] = {
                        "total_detections": tree_count["total_trees"],
                        "by_class": {"arvore": tree_count["total_trees"]},
                        "avg_confidence": 0.85,  # Confiança estimada do algoritmo
                        "detections": [],
                        "source": "tree_segmentation",
                        "note": "Contagem baseada em segmentação de vegetação (ExG)"
                    }
                else:
                    # Adicionar contagem de árvores às detecções existentes
                    existing = analysis_results["object_detection"]
                    existing["tree_segmentation"] = {
                        "total_trees": tree_count["total_trees"],
                        "coverage_percentage": tree_count["coverage_percentage"],
                    }
            except Exception as e:
                if "ml_errors" not in analysis_results:
                    analysis_results["ml_errors"] = []
                analysis_results["ml_errors"].append(f"tree_count: {e}")

        # 4. Detecção de pragas/doenças (SEMPRE executar - independente de torch)
        if detect_pest_disease is not None:
            try:
                pest_results = await asyncio.to_thread(detect_pest_disease, image.file_path)
                analysis_results["pest_disease"] = pest_results
            except Exception as e:
                if "ml_errors" not in analysis_results:
                    analysis_results["ml_errors"] = []
                analysis_results["ml_errors"].append(f"pest_disease: {e}")

        # 5. Estimativa de biomassa (SEMPRE executar - independente de torch)
        if estimate_biomass is not None:
            try:
                biomass = await asyncio.to_thread(estimate_biomass, image.file_path)
                analysis_results["biomass"] = biomass
            except Exception as e:
                if "ml_errors" not in analysis_results:
                    analysis_results["ml_errors"] = []
                analysis_results["ml_errors"].append(f"biomass: {e}")

        # Remover ml_errors se estiver vazio
        if "ml_errors" in analysis_results and not analysis_results["ml_errors"]:
            del analysis_results["ml_errors"]

        processing_time = time.time() - start_time

        # Atualizar análise
        analysis.status = "completed"
        analysis.results = analysis_results
        analysis.processing_time_seconds = round(processing_time, 2)
        analysis.completed_at = datetime.now(timezone.utc)

        # Atualizar status da imagem
        image.status = "analyzed"

        await db.commit()

    except Exception as e:
        # Marcar análise como erro
        analysis.status = "error"
        analysis.error_message = str(e)
        image.status = "error"
        await db.commit()


async def run_video_analysis(image, analysis, db):
    """
    Executar análise de vídeo usando VideoAnalyzer.
    """
    start_time = time.time()

    try:
        if analyze_video is None:
            raise RuntimeError("Analisador de video nao disponivel. Verifique se OpenCV esta instalado.")

        # Usar asyncio.to_thread para não bloquear o event loop
        video_results = await asyncio.to_thread(
            analyze_video,
            image.file_path,
            30,  # sample_rate
            50   # max_frames
        )

        processing_time = time.time() - start_time

        analysis_results = {
            "image_info": {
                "filename": image.original_filename,
                "file_size_mb": round(image.file_size / 1024 / 1024, 2) if image.file_size else None,
                "type": "video",
            },
            "video_info": video_results.get('video_info', {}),
            "key_frames": video_results.get('key_frames', []),
            "frames_analyzed": video_results.get('frame_count_analyzed', 0),
            "temporal_summary": video_results.get('temporal_summary', {}),
            "mosaic_path": video_results.get('mosaic_path'),
        }

        analysis.status = "completed"
        analysis.results = analysis_results
        analysis.processing_time_seconds = round(processing_time, 2)
        analysis.completed_at = datetime.now(timezone.utc)

        if video_results.get('mosaic_path'):
            analysis.output_files = [video_results['mosaic_path']]

        image.status = "analyzed"

        await db.commit()

    except Exception as e:
        analysis.status = "error"
        analysis.error_message = str(e)
        image.status = "error"
        await db.commit()


async def run_project_analysis(project_id: int, image_ids: list[int], video_ids: list[int] = None):
    """
    Executar análise em background para todas as imagens e vídeos de um projeto.

    Esta função é executada de forma assíncrona após o upload.
    """
    if video_ids is None:
        video_ids = []

    async with async_session_maker() as db:
        try:
            # Processar imagens
            for image_id in image_ids:
                result = await db.execute(
                    select(Image).where(Image.id == image_id)
                )
                image = result.scalar_one_or_none()

                if not image or not os.path.exists(image.file_path):
                    continue

                # Verificar se já existe análise completa
                existing = await db.execute(
                    select(Analysis).where(
                        Analysis.image_id == image_id,
                        Analysis.analysis_type == "full_report",
                        Analysis.status == "completed"
                    )
                )
                if existing.scalar_one_or_none():
                    continue

                # Criar registro de análise
                analysis = Analysis(
                    analysis_type="full_report",
                    status="processing",
                    image_id=image_id,
                    config={"threshold": 0.3, "auto_triggered": True, "ml_enabled": ML_AVAILABLE}
                )
                db.add(analysis)
                await db.commit()
                await db.refresh(analysis)

                await run_image_full_analysis(image, analysis, db)

            # Processar vídeos
            for video_id in video_ids:
                result = await db.execute(
                    select(Image).where(Image.id == video_id)
                )
                image = result.scalar_one_or_none()

                if not image or not os.path.exists(image.file_path):
                    continue

                # Verificar se já existe análise de vídeo completa
                existing = await db.execute(
                    select(Analysis).where(
                        Analysis.image_id == video_id,
                        Analysis.analysis_type == "video_analysis",
                        Analysis.status == "completed"
                    )
                )
                if existing.scalar_one_or_none():
                    continue

                # Criar registro de análise de vídeo
                analysis = Analysis(
                    analysis_type="video_analysis",
                    status="processing",
                    image_id=video_id,
                    config={"sample_rate": 30, "max_frames": 50, "auto_triggered": True}
                )
                db.add(analysis)
                await db.commit()
                await db.refresh(analysis)

                await run_video_analysis(image, analysis, db)

            # Atualizar coordenadas do projeto pelo centroide de todas as imagens com GPS
            all_ids = image_ids + video_ids
            if all_ids:
                images_result = await db.execute(
                    select(Image).where(
                        Image.id.in_(all_ids),
                        Image.center_lat.isnot(None),
                        Image.center_lon.isnot(None)
                    )
                )
                gps_images = images_result.scalars().all()

                if gps_images:
                    avg_lat = sum(img.center_lat for img in gps_images) / len(gps_images)
                    avg_lon = sum(img.center_lon for img in gps_images) / len(gps_images)

                    project_result = await db.execute(
                        select(Project).where(Project.id == project_id)
                    )
                    project = project_result.scalar_one_or_none()
                    if project:
                        project.latitude = avg_lat
                        project.longitude = avg_lon
                        await db.commit()

            # Atualizar status do projeto
            project_result = await db.execute(
                select(Project).where(Project.id == project_id)
            )
            project = project_result.scalar_one_or_none()
            if project:
                project.status = "completed"
                await db.commit()

        except Exception as e:
            logger.error("Erro na análise do projeto %d: %s", project_id, e)

            # Garantir que o projeto não fique preso em "processing"
            try:
                project_result = await db.execute(
                    select(Project).where(Project.id == project_id)
                )
                project = project_result.scalar_one_or_none()
                if project and project.status == "processing":
                    project.status = "error"
                    await db.commit()
            except Exception as recovery_err:
                logger.error("Failed to update project %d status after error: %s", project_id, recovery_err)


@router.get("/", response_model=ProjectListResponse)
async def list_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Listar todos os projetos do usuário."""
    from sqlalchemy.orm import selectinload

    # Contar total
    count_query = select(func.count(Project.id)).where(Project.owner_id == current_user.id)
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Buscar projetos com imagens
    query = (
        select(Project)
        .options(selectinload(Project.images))
        .where(Project.owner_id == current_user.id)
        .offset(skip)
        .limit(limit)
        .order_by(Project.created_at.desc())
    )
    result = await db.execute(query)
    projects = result.scalars().all()

    # Converter para resposta com contagem de imagens
    projects_response = []
    for project in projects:
        project_dict = {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "status": project.status or "pending",
            "location": project.location,
            "latitude": project.latitude,
            "longitude": project.longitude,
            "total_area_ha": project.total_area_ha,
            "area_hectares": project.total_area_ha,
            "image_count": len(project.images) if project.images else 0,
            "owner_id": project.owner_id,
            "created_at": project.created_at,
            "updated_at": project.updated_at,
        }
        projects_response.append(project_dict)

    return {"projects": projects_response, "total": total}


@router.get("/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obter estatísticas agregadas do dashboard do usuário.

    Retorna contagens totais de projetos, imagens, análises,
    área total e distribuições por status e tipo.
    """
    # Total de projetos do usuário
    total_projects_result = await db.execute(
        select(func.count(Project.id)).where(Project.owner_id == current_user.id)
    )
    total_projects = total_projects_result.scalar() or 0

    # Total de imagens (join com Project)
    total_images_result = await db.execute(
        select(func.count(Image.id))
        .join(Project, Image.project_id == Project.id)
        .where(Project.owner_id == current_user.id)
    )
    total_images = total_images_result.scalar() or 0

    # Total de análises (join Image -> Project)
    total_analyses_result = await db.execute(
        select(func.count(Analysis.id))
        .join(Image, Analysis.image_id == Image.id)
        .join(Project, Image.project_id == Project.id)
        .where(Project.owner_id == current_user.id)
    )
    total_analyses = total_analyses_result.scalar() or 0

    # Área total em hectares
    total_area_result = await db.execute(
        select(func.sum(Project.total_area_ha))
        .where(Project.owner_id == current_user.id)
    )
    total_area_ha = total_area_result.scalar() or 0.0

    # Projetos por status
    projects_by_status_result = await db.execute(
        select(Project.status, func.count(Project.id))
        .where(Project.owner_id == current_user.id)
        .group_by(Project.status)
    )
    projects_by_status_raw = projects_by_status_result.all()
    projects_by_status = {
        "pending": 0,
        "processing": 0,
        "completed": 0,
        "error": 0
    }
    for status_val, count in projects_by_status_raw:
        if status_val in projects_by_status:
            projects_by_status[status_val] = count

    # Análises por tipo (join Image -> Project)
    analyses_by_type_result = await db.execute(
        select(Analysis.analysis_type, func.count(Analysis.id))
        .join(Image, Analysis.image_id == Image.id)
        .join(Project, Image.project_id == Project.id)
        .where(Project.owner_id == current_user.id)
        .group_by(Analysis.analysis_type)
    )
    analyses_by_type_raw = analyses_by_type_result.all()
    analyses_by_type = {analysis_type: count for analysis_type, count in analyses_by_type_raw}

    return {
        "total_projects": total_projects,
        "total_images": total_images,
        "total_analyses": total_analyses,
        "total_area_ha": round(total_area_ha, 2),
        "projects_by_status": projects_by_status,
        "analyses_by_type": analyses_by_type
    }


@router.get("/comparison")
async def get_projects_comparison(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Comparar projetos do usuário com métricas agregadas.

    Retorna lista de projetos com contagem de imagens,
    cobertura vegetal média, índice de saúde, contagem
    de árvores e outras métricas calculadas.
    """
    from sqlalchemy.orm import selectinload

    # Buscar todos os projetos do usuário com imagens carregadas
    projects_result = await db.execute(
        select(Project)
        .options(selectinload(Project.images))
        .where(Project.owner_id == current_user.id)
        .order_by(Project.created_at.desc())
    )
    projects = projects_result.scalars().all()

    projects_data = []

    for project in projects:
        # Contar imagens do projeto
        image_count = len(project.images) if project.images else 0

        # Buscar análises completas para este projeto
        analyses_result = await db.execute(
            select(Analysis)
            .join(Image, Analysis.image_id == Image.id)
            .where(
                Image.project_id == project.id,
                Analysis.analysis_type == "full_report",
                Analysis.status == "completed"
            )
        )
        analyses = analyses_result.scalars().all()

        # Calcular métricas agregadas
        vegetation_coverages = []
        health_indices = []
        total_trees = 0

        for analysis in analyses:
            if not analysis.results:
                continue

            results = analysis.results

            # Extrair cobertura vegetal
            if 'vegetation_coverage' in results:
                veg_pct = results['vegetation_coverage'].get('vegetation_percentage', 0)
                vegetation_coverages.append(veg_pct)
            elif 'coverage' in results:
                veg_pct = results['coverage'].get('vegetation_percentage', 0)
                vegetation_coverages.append(veg_pct)

            # Extrair índice de saúde
            if 'vegetation_health' in results:
                health_idx = results['vegetation_health'].get('health_index', 0)
                health_indices.append(health_idx)
            elif 'health' in results:
                health_idx = results['health'].get('health_index', 0)
                health_indices.append(health_idx)

            # Extrair contagem de árvores (object_detection ou tree_count)
            if 'object_detection' in results:
                det = results['object_detection']
                if 'by_class' in det and 'arvore' in det['by_class']:
                    total_trees += det['by_class']['arvore']
                elif 'total_detections' in det:
                    total_trees += det.get('total_detections', 0)
            elif 'tree_count' in results:
                tree_data = results['tree_count']
                total_trees += tree_data.get('total_trees', 0)

        # Calcular médias
        vegetation_coverage_avg = (
            round(sum(vegetation_coverages) / len(vegetation_coverages), 2)
            if vegetation_coverages else 0.0
        )
        health_index_avg = (
            round(sum(health_indices) / len(health_indices), 2)
            if health_indices else 0.0
        )

        projects_data.append({
            "id": project.id,
            "name": project.name,
            "status": project.status or "pending",
            "image_count": image_count,
            "total_area_ha": round(project.total_area_ha, 2) if project.total_area_ha else 0.0,
            "vegetation_coverage_avg": vegetation_coverage_avg,
            "health_index_avg": health_index_avg,
            "total_trees": total_trees,
            "created_at": project.created_at.isoformat() if project.created_at else None
        })

    return {"projects": projects_data}


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Criar novo projeto."""
    project = Project(
        **project_data.model_dump(),
        owner_id=current_user.id
    )

    db.add(project)
    await db.commit()
    await db.refresh(project)

    # Retornar resposta formatada com todos os campos requeridos
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "status": project.status or "pending",
        "location": project.location,
        "latitude": project.latitude,
        "longitude": project.longitude,
        "total_area_ha": project.total_area_ha,
        "area_hectares": project.total_area_ha,
        "image_count": 0,  # Novo projeto não tem imagens
        "owner_id": project.owner_id,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
    }


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obter detalhes de um projeto."""
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(Project)
        .options(selectinload(Project.images))
        .where(
            Project.id == project_id,
            Project.owner_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projeto não encontrado"
        )

    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "status": project.status or "pending",
        "location": project.location,
        "latitude": project.latitude,
        "longitude": project.longitude,
        "total_area_ha": project.total_area_ha,
        "area_hectares": project.total_area_ha,
        "image_count": len(project.images) if project.images else 0,
        "owner_id": project.owner_id,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
    }


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Atualizar projeto."""
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.owner_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projeto não encontrado"
        )

    # Atualizar campos
    update_data = project_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    await db.commit()
    await db.refresh(project)

    # Contar imagens do projeto
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.images))
        .where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projeto não encontrado"
        )

    # Retornar resposta formatada
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "status": project.status or "pending",
        "location": project.location,
        "latitude": project.latitude,
        "longitude": project.longitude,
        "total_area_ha": project.total_area_ha,
        "area_hectares": project.total_area_ha,
        "image_count": len(project.images) if project.images else 0,
        "owner_id": project.owner_id,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
    }


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Excluir projeto."""
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.owner_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projeto não encontrado"
        )

    await db.delete(project)
    await db.commit()


@router.post("/{project_id}/analyze")
async def analyze_project(
    project_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Disparar análise em todas as imagens de um projeto.

    As análises são executadas em background.
    """
    # Verificar projeto
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.owner_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projeto não encontrado"
        )

    # Buscar imagens do projeto que ainda não foram analisadas
    images_result = await db.execute(
        select(Image).where(Image.project_id == project_id)
    )
    images = images_result.scalars().all()

    if not images:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Projeto não possui imagens para analisar"
        )

    # Limpar análises com erro ou stuck em processing para permitir re-análise
    for image in images:
        stale_analyses = await db.execute(
            select(Analysis).where(
                Analysis.image_id == image.id,
                Analysis.status.in_(["error", "processing"])
            )
        )
        for stale_analysis in stale_analyses.scalars().all():
            await db.delete(stale_analysis)
        # Reset image status if it was stuck
        if image.status == "processing" or image.status == "error":
            image.status = "uploaded"
    await db.commit()

    # Separar imagens e vídeos que precisam de análise
    images_to_analyze = []
    videos_to_analyze = []

    for image in images:
        if is_image_file(image.original_filename):
            # Verificar se já existe análise completa
            existing_analysis = await db.execute(
                select(Analysis).where(
                    Analysis.image_id == image.id,
                    Analysis.analysis_type == "full_report",
                    Analysis.status == "completed"
                )
            )
            if not existing_analysis.scalar_one_or_none():
                images_to_analyze.append(image.id)
                image.status = "processing"

        elif is_video_file(image.original_filename):
            # Verificar se já existe análise de vídeo completa
            existing_analysis = await db.execute(
                select(Analysis).where(
                    Analysis.image_id == image.id,
                    Analysis.analysis_type == "video_analysis",
                    Analysis.status == "completed"
                )
            )
            if not existing_analysis.scalar_one_or_none():
                videos_to_analyze.append(image.id)
                image.status = "processing"

    total_to_analyze = len(images_to_analyze) + len(videos_to_analyze)

    if total_to_analyze == 0:
        return {
            "message": "Todas as imagens e vídeos já foram analisados",
            "analyses_started": 0,
            "project_id": project_id
        }

    await db.commit()

    # Atualizar status do projeto
    project.status = "processing"
    await db.commit()

    # Adicionar tarefa em background para executar análises
    background_tasks.add_task(run_project_analysis, project_id, images_to_analyze, videos_to_analyze)

    return {
        "message": f"Análise iniciada para {len(images_to_analyze)} imagem(ns) e {len(videos_to_analyze)} vídeo(s)",
        "analyses_started": total_to_analyze,
        "images_count": len(images_to_analyze),
        "videos_count": len(videos_to_analyze),
        "project_id": project_id
    }


def get_image_gsd_from_xmp(file_path: str) -> float | None:
    """
    Extrair GSD (Ground Sample Distance) dos metadados XMP da imagem.

    Calcula o GSD baseado na altitude relativa de voo e características
    conhecidas de câmeras de drone.

    Retorna GSD em metros/pixel ou None se não for possível calcular.
    """
    import re
    import os

    if not os.path.exists(file_path):
        return None

    try:
        with open(file_path, 'rb') as f:
            data = f.read(65536)  # Ler apenas primeiros 64KB para XMP

        # Buscar altitude relativa no XMP
        match = re.search(rb'RelativeAltitude[="\s]+([+-]?[\d.]+)', data)
        if not match:
            return None

        altitude = float(match.group(1))
        if altitude <= 0:
            return None

        # Câmeras conhecidas e seus parâmetros (sensor_width_mm, focal_length_mm)
        # DJI Mavic 2 Pro (Hasselblad L1D-20c): sensor 13.2mm, focal 10.26mm
        # DJI Mavic Air 2: sensor 6.4mm, focal 4.49mm
        # DJI Phantom 4 Pro: sensor 13.2mm, focal 8.8mm
        # DJI Mini 3 Pro: sensor 9.7mm, focal 6.72mm

        # Valores padrão para Mavic 2 Pro (mais comum em uso profissional)
        sensor_width_mm = 13.2
        focal_length_mm = 10.26
        image_width_pixels = 5472  # Resolução padrão do Mavic 2 Pro

        # Tentar identificar a câmera pelo modelo no EXIF/XMP
        model_match = re.search(rb'Model[="\s>]+([^<"]+)', data)
        if model_match:
            model = model_match.group(1).decode('utf-8', errors='ignore').lower()
            if 'l1d-20c' in model or 'mavic 2' in model:
                sensor_width_mm = 13.2
                focal_length_mm = 10.26
            elif 'phantom 4' in model:
                sensor_width_mm = 13.2
                focal_length_mm = 8.8
            elif 'air 2' in model:
                sensor_width_mm = 6.4
                focal_length_mm = 4.49
            elif 'mini' in model:
                sensor_width_mm = 9.7
                focal_length_mm = 6.72

        # Calcular GSD: GSD = (sensor_width * altitude) / (focal_length * image_width)
        # Converter altitude para mm
        gsd_mm = (sensor_width_mm * altitude * 1000) / (focal_length_mm * image_width_pixels)
        gsd_m = gsd_mm / 1000  # Converter para metros

        return gsd_m

    except Exception:
        return None


def calculate_bounding_box_area_ha(images_with_gps: list, all_images: list = None) -> float:
    """
    Calcular área em hectares baseada no bounding box das coordenadas GPS.

    Para múltiplas imagens: usa bounding box das coordenadas GPS.
    Para uma única imagem: calcula área baseada no GSD real (dos metadados XMP)
    ou estima usando GSD típico de drone.
    """
    import math

    if not images_with_gps and not all_images:
        return 0.0

    # Se temos imagens mas sem GPS, tentar estimar pela dimensão
    if not images_with_gps and all_images:
        total_area_ha = 0.0
        for img in all_images:
            if img.width and img.height:
                # Tentar obter GSD real dos metadados XMP
                gsd_m = get_image_gsd_from_xmp(img.file_path) if hasattr(img, 'file_path') else None
                if not gsd_m:
                    gsd_m = 0.03  # Fallback: 3cm/pixel (drone a ~100m)

                width_m = img.width * gsd_m
                height_m = img.height * gsd_m
                area_m2 = width_m * height_m
                area_ha = area_m2 / 10000
                total_area_ha += area_ha
        return max(round(total_area_ha, 2), 0.5)

    lats = [img.center_lat for img in images_with_gps]
    lons = [img.center_lon for img in images_with_gps]

    min_lat, max_lat = min(lats), max(lats)
    min_lon, max_lon = min(lons), max(lons)

    # Se só tem um ponto, calcular pela dimensão da imagem com GSD real
    if min_lat == max_lat and min_lon == max_lon:
        img = images_with_gps[0]
        if img.width and img.height:
            # Tentar obter GSD real dos metadados XMP
            gsd_m = get_image_gsd_from_xmp(img.file_path) if hasattr(img, 'file_path') else None
            if not gsd_m:
                gsd_m = 0.03  # Fallback: 3cm/pixel

            width_m = img.width * gsd_m
            height_m = img.height * gsd_m
            area_m2 = width_m * height_m
            area_ha = area_m2 / 10000
            return max(round(area_ha, 2), 0.5)
        return 1.0

    # Conversão de graus para metros (aproximação)
    # 1 grau de latitude ≈ 111.32 km
    # 1 grau de longitude ≈ 111.32 km * cos(latitude)
    lat_center = (min_lat + max_lat) / 2
    lat_distance_km = (max_lat - min_lat) * 111.32
    lon_distance_km = (max_lon - min_lon) * 111.32 * math.cos(math.radians(lat_center))

    # Área em km² convertida para hectares (1 km² = 100 ha)
    area_km2 = lat_distance_km * lon_distance_km
    area_ha = area_km2 * 100

    # Mínimo de 1 ha para áreas muito pequenas
    return max(round(area_ha, 2), 1.0)


@router.get("/{project_id}/analysis-summary")
async def get_project_analysis_summary(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obter resumo completo das análises de um projeto.

    Retorna estatísticas agregadas incluindo:
    - Área calculada do bounding box GPS
    - Cobertura vegetal média
    - Índice de saúde médio
    - Detecções YOLO agregadas
    - Classificação de uso do solo
    - Tipo de vegetação dominante
    """
    from sqlalchemy.orm import selectinload

    # Verificar projeto
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.owner_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projeto não encontrado"
        )

    # Buscar todas as imagens do projeto
    images_result = await db.execute(
        select(Image).where(Image.project_id == project_id)
    )
    all_images = images_result.scalars().all()
    total_images = len(all_images)

    # Calcular área do bounding box GPS (ou estimar pelas dimensões da imagem)
    images_with_gps = [img for img in all_images if img.center_lat and img.center_lon]
    calculated_area_ha = calculate_bounding_box_area_ha(images_with_gps, all_images)

    # Usar área do projeto se definida, senão usar calculada
    total_area_ha = project.total_area_ha if project.total_area_ha else calculated_area_ha

    # Atualizar área do projeto se não estiver definida
    if not project.total_area_ha and calculated_area_ha > 0:
        project.total_area_ha = calculated_area_ha
        await db.commit()

    # Buscar análises completas
    analyses_result = await db.execute(
        select(Analysis)
        .where(Analysis.image.has(Image.project_id == project_id))
        .where(Analysis.status == "completed")
    )
    analyses = analyses_result.scalars().all()

    # Inicializar agregadores
    vegetation_percentages = []
    health_indices = []
    healthy_percentages = []
    stressed_percentages = []
    critical_percentages = []
    land_use_totals = {}
    segmentation_totals = {}
    vegetation_types = {}
    total_objects_detected = 0
    objects_by_class = {}
    biomass_indices = []
    pest_infection_rates = []

    for analysis in analyses:
        if not analysis.results:
            continue

        results = analysis.results

        # Cobertura de vegetação
        if 'vegetation_coverage' in results:
            veg = results['vegetation_coverage'].get('vegetation_percentage', 0)
            vegetation_percentages.append(veg)
        elif 'coverage' in results:
            veg = results['coverage'].get('vegetation_percentage', 0)
            vegetation_percentages.append(veg)

        # Saúde da vegetação
        # NOTA: healthy = muito saudável, moderate = saudável normal, stressed = estressada
        # Combinamos healthy + moderate como "saudável" pois ambos indicam vegetação em bom estado
        if 'vegetation_health' in results:
            health_data = results['vegetation_health']
            health_indices.append(health_data.get('health_index', 0))
            # Saudável = healthy + moderate (vegetação em bom estado)
            healthy_pct = health_data.get('healthy_percentage', 0) + health_data.get('moderate_percentage', 0)
            healthy_percentages.append(healthy_pct)
            # Estressada = stressed (vegetação com problemas)
            stressed_percentages.append(health_data.get('stressed_percentage', 0))
            # Crítica = non_vegetation ou valor residual
            critical_percentages.append(health_data.get('non_vegetation_percentage', 0))
        elif 'health' in results:
            health_data = results['health']
            health_indices.append(health_data.get('health_index', 0))
            # Saudável = healthy + moderate
            healthy_pct = health_data.get('healthy_percentage', 0) + health_data.get('moderate_percentage', 0)
            healthy_percentages.append(healthy_pct)
            stressed_percentages.append(health_data.get('stressed_percentage', 0))
            critical_percentages.append(health_data.get('non_vegetation_percentage', 0))

        # Uso do solo (classificação de cena)
        if 'scene_classification' in results:
            scene = results['scene_classification']
            if 'land_use_percentages' in scene:
                for category, value in scene['land_use_percentages'].items():
                    if isinstance(value, (int, float)):
                        if category not in land_use_totals:
                            land_use_totals[category] = []
                        land_use_totals[category].append(value)
        elif 'land_use' in results:
            for category, value in results['land_use'].items():
                if isinstance(value, (int, float)):
                    if category not in land_use_totals:
                        land_use_totals[category] = []
                    land_use_totals[category].append(value)

        # Segmentação (DeepLabV3)
        if 'segmentation' in results:
            seg = results['segmentation']
            if 'category_percentages' in seg:
                for category, value in seg['category_percentages'].items():
                    if isinstance(value, (int, float)):
                        if category not in segmentation_totals:
                            segmentation_totals[category] = []
                        segmentation_totals[category].append(value)

        # Tipo de vegetação
        if 'vegetation_type' in results:
            veg_type = results['vegetation_type']
            if veg_type.get('vegetation_type'):
                vtype = veg_type['vegetation_type']
                vegetation_types[vtype] = vegetation_types.get(vtype, 0) + 1

        # Detecção de objetos (YOLO ou segmentação de árvores)
        if 'object_detection' in results:
            det = results['object_detection']
            if det.get('total_detections'):
                total_objects_detected += det['total_detections']
            if det.get('by_class'):
                for cls, count in det['by_class'].items():
                    objects_by_class[cls] = objects_by_class.get(cls, 0) + count

        # Contagem de árvores por segmentação (backup se YOLO não detectar)
        if 'tree_count' in results and total_objects_detected == 0:
            tree_data = results['tree_count']
            if tree_data.get('total_trees'):
                total_objects_detected += tree_data['total_trees']
                objects_by_class['arvore'] = objects_by_class.get('arvore', 0) + tree_data['total_trees']

        # Biomassa
        if 'biomass' in results:
            biomass_data = results['biomass']
            if biomass_data.get('biomass_index') is not None:
                biomass_indices.append(biomass_data['biomass_index'])

        # Pragas/doenças
        if 'pest_disease' in results:
            pest_data = results['pest_disease']
            if pest_data.get('infection_rate') is not None:
                pest_infection_rates.append(pest_data['infection_rate'])

    # Calcular médias
    avg_vegetation = sum(vegetation_percentages) / len(vegetation_percentages) if vegetation_percentages else 0
    avg_health = sum(health_indices) / len(health_indices) if health_indices else 0
    avg_healthy = sum(healthy_percentages) / len(healthy_percentages) if healthy_percentages else 0
    avg_stressed = sum(stressed_percentages) / len(stressed_percentages) if stressed_percentages else 0
    avg_critical = sum(critical_percentages) / len(critical_percentages) if critical_percentages else 0

    # Média de uso do solo
    land_use_summary = {
        cat: round(sum(vals) / len(vals), 2) for cat, vals in land_use_totals.items()
    }

    # Média de segmentação
    segmentation_summary = {
        cat: round(sum(vals) / len(vals), 2) for cat, vals in segmentation_totals.items()
    }

    # Tipo de vegetação dominante
    dominant_vegetation_type = max(vegetation_types, key=vegetation_types.get) if vegetation_types else None

    # Número de imagens analisadas (full_report ou roi_analysis)
    analyzed_image_ids = set(a.image_id for a in analyses if a.analysis_type in ('full_report', 'roi_analysis'))

    return {
        "project_id": project_id,
        "project_name": project.name,
        "total_images": total_images,
        "analyzed_images": len(analyzed_image_ids),
        "pending_images": total_images - len(analyzed_image_ids),
        "total_area_ha": round(total_area_ha, 2),

        # Agregados de vegetação
        "vegetation_coverage_avg": round(avg_vegetation, 2),
        "health_index_avg": round(avg_health, 2),
        "healthy_percentage": round(avg_healthy, 2),
        "stressed_percentage": round(avg_stressed, 2),
        "critical_percentage": round(avg_critical, 2),

        # Detecções YOLO agregadas
        "total_objects_detected": total_objects_detected,
        "objects_by_class": objects_by_class,

        # Classificação de uso do solo
        "land_use_summary": land_use_summary,
        "segmentation_summary": segmentation_summary,

        # Tipo de vegetação dominante
        "dominant_vegetation_type": dominant_vegetation_type,

        # Biomassa
        "biomass_index_avg": round(sum(biomass_indices) / len(biomass_indices), 2) if biomass_indices else None,
        "biomass_density_class": (
            "esparsa" if biomass_indices and sum(biomass_indices) / len(biomass_indices) < 25
            else "moderada" if biomass_indices and sum(biomass_indices) / len(biomass_indices) < 50
            else "densa" if biomass_indices and sum(biomass_indices) / len(biomass_indices) < 75
            else "muito_densa" if biomass_indices
            else None
        ),

        # Pragas/doenças
        "pest_infection_rate_avg": round(sum(pest_infection_rates) / len(pest_infection_rates), 2) if pest_infection_rates else None,

        # Status do projeto
        "status": project.status
    }


@router.get("/{project_id}/timeline")
async def get_project_timeline(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obter evolução temporal do projeto.

    Agrupa análises completas por semana ISO e retorna
    médias de cobertura, saúde e contagem de árvores por período.
    """
    # Verificar projeto
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.owner_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projeto não encontrado"
        )

    # Buscar análises completas
    analyses_result = await db.execute(
        select(Analysis)
        .join(Image, Analysis.image_id == Image.id)
        .where(
            Image.project_id == project_id,
            Analysis.analysis_type == "full_report",
            Analysis.status == "completed"
        )
        .order_by(Analysis.completed_at)
    )
    analyses = analyses_result.scalars().all()

    if not analyses:
        return {"project_id": project_id, "timeline": []}

    # Group by ISO week
    weeks: dict[str, dict] = {}

    for analysis in analyses:
        if not analysis.results or not analysis.completed_at:
            continue

        results = analysis.results
        week_key = analysis.completed_at.strftime("%G-W%V")

        if week_key not in weeks:
            weeks[week_key] = {
                "coverages": [],
                "health_indices": [],
                "tree_counts": [],
                "date": analysis.completed_at.isoformat(),
            }

        # Extract coverage
        if "vegetation_coverage" in results:
            weeks[week_key]["coverages"].append(
                results["vegetation_coverage"].get("vegetation_percentage", 0)
            )
        elif "coverage" in results:
            weeks[week_key]["coverages"].append(
                results["coverage"].get("vegetation_percentage", 0)
            )

        # Extract health
        if "vegetation_health" in results:
            weeks[week_key]["health_indices"].append(
                results["vegetation_health"].get("health_index", 0)
            )
        elif "health" in results:
            weeks[week_key]["health_indices"].append(
                results["health"].get("health_index", 0)
            )

        # Extract tree count
        if "tree_count" in results:
            weeks[week_key]["tree_counts"].append(
                results["tree_count"].get("total_trees", 0)
            )
        elif "object_detection" in results:
            det = results["object_detection"]
            if "by_class" in det and "arvore" in det["by_class"]:
                weeks[week_key]["tree_counts"].append(det["by_class"]["arvore"])

    # Build timeline
    timeline = []
    for week_key in sorted(weeks.keys()):
        data = weeks[week_key]
        entry = {
            "periodo": week_key,
            "date": data["date"],
        }
        if data["coverages"]:
            entry["cobertura"] = round(sum(data["coverages"]) / len(data["coverages"]), 2)
        if data["health_indices"]:
            entry["saude"] = round(sum(data["health_indices"]) / len(data["health_indices"]), 2)
        if data["tree_counts"]:
            entry["arvores"] = round(sum(data["tree_counts"]) / len(data["tree_counts"]))

        timeline.append(entry)

    return {"project_id": project_id, "timeline": timeline}


@router.get("/{project_id}/alerts")
async def get_project_alerts(
    project_id: int,
    veg_critical: float = Query(30.0, description="Limiar critico de cobertura vegetal (%)"),
    veg_warning: float = Query(50.0, description="Limiar de alerta de cobertura vegetal (%)"),
    health_critical: float = Query(0.5, description="Limiar critico de saude"),
    health_warning: float = Query(0.7, description="Limiar de alerta de saude"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obter alertas de saude do projeto baseados em limiares configuraveis.

    Analisa os resultados mais recentes e retorna alertas com severidade
    (critical/warning) para metricas abaixo dos limiares.
    """
    # Verificar projeto
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.owner_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projeto nao encontrado"
        )

    # Buscar analises completas
    analyses_result = await db.execute(
        select(Analysis)
        .join(Image, Analysis.image_id == Image.id)
        .where(
            Image.project_id == project_id,
            Analysis.analysis_type == "full_report",
            Analysis.status == "completed"
        )
    )
    analyses = analyses_result.scalars().all()

    if not analyses:
        return {"project_id": project_id, "alerts": [], "summary": "Sem analises disponiveis"}

    # Agregar metricas
    veg_percentages = []
    health_indices = []
    tree_counts = []

    for analysis in analyses:
        if not analysis.results:
            continue
        r = analysis.results
        if "vegetation_coverage" in r:
            veg_percentages.append(r["vegetation_coverage"].get("vegetation_percentage", 0))
        elif "coverage" in r:
            veg_percentages.append(r["coverage"].get("vegetation_percentage", 0))

        if "vegetation_health" in r:
            health_indices.append(r["vegetation_health"].get("health_index", 0))
        elif "health" in r:
            health_indices.append(r["health"].get("health_index", 0))

        if "tree_count" in r:
            tree_counts.append(r["tree_count"].get("total_trees", 0))

    alerts = []

    # Verificar cobertura vegetal
    if veg_percentages:
        avg_veg = sum(veg_percentages) / len(veg_percentages)
        if avg_veg < veg_critical:
            alerts.append({
                "severity": "critical",
                "metric": "vegetation_coverage",
                "message": f"Cobertura vegetal abaixo de {veg_critical}% (atual: {avg_veg:.1f}%)",
                "current_value": round(avg_veg, 2),
                "threshold": veg_critical,
            })
        elif avg_veg < veg_warning:
            alerts.append({
                "severity": "warning",
                "metric": "vegetation_coverage",
                "message": f"Cobertura vegetal abaixo de {veg_warning}% (atual: {avg_veg:.1f}%)",
                "current_value": round(avg_veg, 2),
                "threshold": veg_warning,
            })

    # Verificar saude
    if health_indices:
        avg_health = sum(health_indices) / len(health_indices)
        if avg_health < health_critical:
            alerts.append({
                "severity": "critical",
                "metric": "health_index",
                "message": f"Indice de saude abaixo de {health_critical} (atual: {avg_health:.2f})",
                "current_value": round(avg_health, 2),
                "threshold": health_critical,
            })
        elif avg_health < health_warning:
            alerts.append({
                "severity": "warning",
                "metric": "health_index",
                "message": f"Indice de saude abaixo de {health_warning} (atual: {avg_health:.2f})",
                "current_value": round(avg_health, 2),
                "threshold": health_warning,
            })

    # Verificar se nao ha arvores detectadas
    if tree_counts and sum(tree_counts) == 0 and len(analyses) > 0:
        alerts.append({
            "severity": "warning",
            "metric": "tree_count",
            "message": "Nenhuma arvore detectada nas analises",
            "current_value": 0,
            "threshold": 1,
        })

    # Verificar pragas/doencas
    pest_infection_rates = []
    for analysis in analyses:
        if analysis.results and "pest_disease" in analysis.results:
            pest_infection_rates.append(
                analysis.results["pest_disease"].get("infection_rate", 0)
            )

    if pest_infection_rates:
        avg_infection = sum(pest_infection_rates) / len(pest_infection_rates)
        if avg_infection > 30:
            alerts.append({
                "severity": "critical",
                "metric": "pest_disease",
                "message": f"Pragas/doencas detectadas em {avg_infection:.1f}% da area vegetal",
                "current_value": round(avg_infection, 2),
                "threshold": 30,
            })
        elif avg_infection > 10:
            alerts.append({
                "severity": "warning",
                "metric": "pest_disease",
                "message": f"Sinais de pragas/doencas em {avg_infection:.1f}% da area vegetal",
                "current_value": round(avg_infection, 2),
                "threshold": 10,
            })

    # Verificar biomassa
    biomass_indices = []
    for analysis in analyses:
        if analysis.results and "biomass" in analysis.results:
            biomass_indices.append(
                analysis.results["biomass"].get("biomass_index", 0)
            )

    if biomass_indices:
        avg_biomass = sum(biomass_indices) / len(biomass_indices)
        if avg_biomass < 10:
            alerts.append({
                "severity": "critical",
                "metric": "biomass",
                "message": f"Biomassa muito baixa (indice {avg_biomass:.1f}/100). Cobertura vegetal critica.",
                "current_value": round(avg_biomass, 2),
                "threshold": 10,
            })
        elif avg_biomass < 25:
            alerts.append({
                "severity": "warning",
                "metric": "biomass",
                "message": f"Biomassa esparsa (indice {avg_biomass:.1f}/100). Considere avaliar condicoes do solo.",
                "current_value": round(avg_biomass, 2),
                "threshold": 25,
            })

    return {
        "project_id": project_id,
        "alerts": alerts,
        "summary": f"{len(alerts)} alerta(s) encontrado(s)" if alerts else "Projeto saudavel"
    }


@router.get("/{project_id}/enriched-data")
async def get_project_enriched_data(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Buscar dados enriquecidos do projeto via APIs externas.

    Busca em paralelo: clima (Open-Meteo), solo (SoilGrids),
    elevação (Open Topo Data) e endereço (Nominatim/OSM).

    Requer que o projeto tenha coordenadas GPS definidas.
    Resultados são cacheados no banco para evitar chamadas repetidas.
    """
    import asyncio
    from backend.services.external.weather import get_weather_data
    from backend.services.external.soil import get_soil_data
    from backend.services.external.elevation import get_elevation_data
    from backend.services.external.geocoding import get_geocoding_data

    # Verificar projeto
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.owner_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projeto não encontrado"
        )

    if not project.latitude or not project.longitude:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Projeto não possui coordenadas GPS. Faça upload de imagens com dados GPS."
        )

    lat = project.latitude
    lon = project.longitude

    # Verificar cache: buscar análise do tipo enriched_data para este projeto
    # Usamos uma análise fictícia vinculada à primeira imagem do projeto como cache
    from sqlalchemy.orm import selectinload
    project_with_images = await db.execute(
        select(Project)
        .options(selectinload(Project.images))
        .where(Project.id == project_id)
    )
    proj = project_with_images.scalar_one()
    first_image = proj.images[0] if proj.images else None

    if first_image:
        cache_result = await db.execute(
            select(Analysis).where(
                Analysis.image_id == first_image.id,
                Analysis.analysis_type == "enriched_data",
                Analysis.status == "completed"
            ).order_by(Analysis.completed_at.desc())
        )
        cached = cache_result.scalars().first()
        if cached and cached.results:
            return {
                "project_id": project_id,
                "cached": True,
                "cached_at": cached.completed_at.isoformat() if cached.completed_at else None,
                **cached.results,
            }

    # Buscar dados em paralelo
    weather_task = get_weather_data(lat, lon)
    soil_task = get_soil_data(lat, lon)
    elevation_task = get_elevation_data(lat, lon)
    geocoding_task = get_geocoding_data(lat, lon)

    weather, soil, elevation, geocoding = await asyncio.gather(
        weather_task, soil_task, elevation_task, geocoding_task,
        return_exceptions=True
    )

    # Tratar exceções
    if isinstance(weather, Exception):
        weather = {"error": str(weather), "source": "Open-Meteo"}
    if isinstance(soil, Exception):
        soil = {"error": str(soil), "source": "SoilGrids/ISRIC"}
    if isinstance(elevation, Exception):
        elevation = {"error": str(elevation), "source": "Open Topo Data"}
    if isinstance(geocoding, Exception):
        geocoding = {"error": str(geocoding), "source": "Nominatim/OpenStreetMap"}

    enriched = {
        "coordinates": {"latitude": lat, "longitude": lon},
        "weather": weather,
        "soil": soil,
        "elevation": elevation,
        "geocoding": geocoding,
    }

    # Salvar cache no banco
    if first_image:
        cache_analysis = Analysis(
            analysis_type="enriched_data",
            status="completed",
            image_id=first_image.id,
            results=enriched,
            completed_at=datetime.now(timezone.utc),
        )
        db.add(cache_analysis)
        await db.commit()

    return {
        "project_id": project_id,
        "cached": False,
        **enriched,
    }
