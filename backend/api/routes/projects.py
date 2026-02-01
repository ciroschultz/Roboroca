"""
Projects Routes
Endpoints para gerenciamento de projetos (fazendas/propriedades).
"""

from typing import Optional
import asyncio

from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from backend.core.database import get_db
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

router = APIRouter(prefix="/projects")


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

    return project


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

    return project


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

    # Verificar quais imagens já têm análise completa
    analyses_count = 0
    for image in images:
        # Verificar se já existe análise para esta imagem
        existing_analysis = await db.execute(
            select(Analysis).where(
                Analysis.image_id == image.id,
                Analysis.analysis_type == "full_report",
                Analysis.status == "completed"
            )
        )
        if not existing_analysis.scalar_one_or_none():
            analyses_count += 1
            # Marcar imagem como em processamento
            image.status = "processing"

    await db.commit()

    # Atualizar status do projeto
    project.status = "processing"
    await db.commit()

    return {
        "message": f"Análise iniciada para {analyses_count} imagem(ns)",
        "analyses_started": analyses_count,
        "project_id": project_id
    }


@router.get("/{project_id}/analysis-summary")
async def get_project_analysis_summary(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obter resumo das análises de um projeto.
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

    # Contar imagens
    images_result = await db.execute(
        select(func.count(Image.id)).where(Image.project_id == project_id)
    )
    total_images = images_result.scalar() or 0

    # Buscar análises completas
    analyses_result = await db.execute(
        select(Analysis)
        .where(Analysis.image.has(Image.project_id == project_id))
        .where(Analysis.status == "completed")
    )
    analyses = analyses_result.scalars().all()

    # Calcular médias
    vegetation_percentages = []
    health_indices = []
    land_use_totals = {}

    for analysis in analyses:
        if analysis.results:
            # Cobertura de vegetação
            if 'vegetation_coverage' in analysis.results:
                veg = analysis.results['vegetation_coverage'].get('vegetation_percentage', 0)
                vegetation_percentages.append(veg)
            elif 'coverage' in analysis.results:
                veg = analysis.results['coverage'].get('vegetation_percentage', 0)
                vegetation_percentages.append(veg)

            # Saúde
            if 'vegetation_health' in analysis.results:
                health = analysis.results['vegetation_health'].get('health_index', 0)
                health_indices.append(health)
            elif 'health' in analysis.results:
                health = analysis.results['health'].get('health_index', 0)
                health_indices.append(health)

            # Uso do solo
            if 'land_use' in analysis.results:
                for category, value in analysis.results['land_use'].items():
                    if category not in land_use_totals:
                        land_use_totals[category] = []
                    land_use_totals[category].append(value)

    # Calcular médias
    avg_vegetation = sum(vegetation_percentages) / len(vegetation_percentages) if vegetation_percentages else 0
    avg_health = sum(health_indices) / len(health_indices) if health_indices else 0
    land_use_summary = {
        cat: sum(vals) / len(vals) for cat, vals in land_use_totals.items()
    }

    return {
        "project_id": project_id,
        "project_name": project.name,
        "total_images": total_images,
        "analyzed_images": len(set(a.image_id for a in analyses)),
        "pending_images": total_images - len(set(a.image_id for a in analyses)),
        "vegetation_coverage_avg": round(avg_vegetation, 2),
        "health_index_avg": round(avg_health, 2),
        "land_use_summary": land_use_summary,
        "status": project.status
    }
