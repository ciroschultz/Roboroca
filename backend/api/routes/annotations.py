"""
Annotations Routes
Endpoints para gerenciamento de anotacoes de mapa.
"""

from typing import Optional, List
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from backend.core.database import get_db
from backend.models.user import User
from backend.models.image import Image
from backend.models.annotation import Annotation
from backend.api.dependencies.auth import get_current_user

router = APIRouter(prefix="/annotations")


# Schemas
class AnnotationData(BaseModel):
    """Dados da anotacao."""
    x: Optional[float] = None
    y: Optional[float] = None
    points: Optional[List[List[float]]] = None
    start: Optional[dict] = None
    end: Optional[dict] = None
    center: Optional[dict] = None
    radius: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    label: Optional[str] = None
    color: Optional[str] = "#FF0000"
    fill_opacity: Optional[float] = 0.3
    distance_pixels: Optional[float] = None
    distance_meters: Optional[float] = None
    icon: Optional[str] = "marker"


class AnnotationCreate(BaseModel):
    """Schema para criar anotacao."""
    image_id: int
    annotation_type: str  # point, polygon, measurement, circle, rectangle
    data: dict


class AnnotationUpdate(BaseModel):
    """Schema para atualizar anotacao."""
    data: Optional[dict] = None
    annotation_type: Optional[str] = None


class AnnotationResponse(BaseModel):
    """Schema de resposta de anotacao."""
    id: int
    image_id: int
    annotation_type: str
    data: dict
    created_by: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AnnotationListResponse(BaseModel):
    """Schema de resposta de lista de anotacoes."""
    annotations: List[AnnotationResponse]
    total: int


@router.post("/", response_model=AnnotationResponse, status_code=status.HTTP_201_CREATED)
async def create_annotation(
    annotation_data: AnnotationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Criar nova anotacao para uma imagem.

    Tipos suportados:
    - point: Marcador de ponto
    - polygon: Poligono com multiplos vertices
    - measurement: Linha de medicao entre dois pontos
    - circle: Circulo com centro e raio
    - rectangle: Retangulo com posicao e dimensoes
    """
    # Verificar se a imagem existe e pertence a um projeto do usuario
    result = await db.execute(
        select(Image)
        .where(Image.id == annotation_data.image_id)
    )
    image = result.scalar_one_or_none()

    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imagem nao encontrada"
        )

    # Verificar se o usuario tem acesso ao projeto da imagem
    from backend.models.project import Project
    project_result = await db.execute(
        select(Project).where(
            Project.id == image.project_id,
            Project.owner_id == current_user.id
        )
    )
    project = project_result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado a esta imagem"
        )

    # Validar tipo de anotacao
    valid_types = ['point', 'polygon', 'measurement', 'circle', 'rectangle']
    if annotation_data.annotation_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de anotacao invalido. Tipos validos: {', '.join(valid_types)}"
        )

    # Criar anotacao
    annotation = Annotation(
        image_id=annotation_data.image_id,
        annotation_type=annotation_data.annotation_type,
        data=annotation_data.data,
        created_by=current_user.id
    )

    db.add(annotation)
    await db.commit()
    await db.refresh(annotation)

    return AnnotationResponse(
        id=annotation.id,
        image_id=annotation.image_id,
        annotation_type=annotation.annotation_type,
        data=annotation.data,
        created_by=annotation.created_by,
        created_at=annotation.created_at,
        updated_at=annotation.updated_at
    )


@router.get("/", response_model=AnnotationListResponse)
async def list_annotations(
    image_id: int = Query(..., description="ID da imagem"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar todas as anotacoes de uma imagem.
    """
    # Verificar se a imagem existe
    result = await db.execute(
        select(Image).where(Image.id == image_id)
    )
    image = result.scalar_one_or_none()

    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imagem nao encontrada"
        )

    # Verificar acesso ao projeto
    from backend.models.project import Project
    project_result = await db.execute(
        select(Project).where(
            Project.id == image.project_id,
            Project.owner_id == current_user.id
        )
    )
    if not project_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado a esta imagem"
        )

    # Buscar anotacoes
    annotations_result = await db.execute(
        select(Annotation)
        .where(Annotation.image_id == image_id)
        .order_by(Annotation.created_at.asc())
    )
    annotations = annotations_result.scalars().all()

    return AnnotationListResponse(
        annotations=[
            AnnotationResponse(
                id=a.id,
                image_id=a.image_id,
                annotation_type=a.annotation_type,
                data=a.data,
                created_by=a.created_by,
                created_at=a.created_at,
                updated_at=a.updated_at
            )
            for a in annotations
        ],
        total=len(annotations)
    )


@router.get("/{annotation_id}", response_model=AnnotationResponse)
async def get_annotation(
    annotation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obter detalhes de uma anotacao.
    """
    result = await db.execute(
        select(Annotation).where(Annotation.id == annotation_id)
    )
    annotation = result.scalar_one_or_none()

    if not annotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Anotacao nao encontrada"
        )

    # Verificar acesso
    image_result = await db.execute(
        select(Image).where(Image.id == annotation.image_id)
    )
    image = image_result.scalar_one_or_none()

    from backend.models.project import Project
    project_result = await db.execute(
        select(Project).where(
            Project.id == image.project_id,
            Project.owner_id == current_user.id
        )
    )
    if not project_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado"
        )

    return AnnotationResponse(
        id=annotation.id,
        image_id=annotation.image_id,
        annotation_type=annotation.annotation_type,
        data=annotation.data,
        created_by=annotation.created_by,
        created_at=annotation.created_at,
        updated_at=annotation.updated_at
    )


@router.put("/{annotation_id}", response_model=AnnotationResponse)
async def update_annotation(
    annotation_id: int,
    update_data: AnnotationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Atualizar uma anotacao.
    """
    result = await db.execute(
        select(Annotation).where(Annotation.id == annotation_id)
    )
    annotation = result.scalar_one_or_none()

    if not annotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Anotacao nao encontrada"
        )

    # Verificar acesso
    image_result = await db.execute(
        select(Image).where(Image.id == annotation.image_id)
    )
    image = image_result.scalar_one_or_none()

    from backend.models.project import Project
    project_result = await db.execute(
        select(Project).where(
            Project.id == image.project_id,
            Project.owner_id == current_user.id
        )
    )
    if not project_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado"
        )

    # Atualizar campos
    if update_data.data is not None:
        annotation.data = update_data.data
    if update_data.annotation_type is not None:
        valid_types = ['point', 'polygon', 'measurement', 'circle', 'rectangle']
        if update_data.annotation_type not in valid_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tipo de anotacao invalido. Tipos validos: {', '.join(valid_types)}"
            )
        annotation.annotation_type = update_data.annotation_type

    annotation.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(annotation)

    return AnnotationResponse(
        id=annotation.id,
        image_id=annotation.image_id,
        annotation_type=annotation.annotation_type,
        data=annotation.data,
        created_by=annotation.created_by,
        created_at=annotation.created_at,
        updated_at=annotation.updated_at
    )


@router.delete("/{annotation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_annotation(
    annotation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Excluir uma anotacao.
    """
    result = await db.execute(
        select(Annotation).where(Annotation.id == annotation_id)
    )
    annotation = result.scalar_one_or_none()

    if not annotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Anotacao nao encontrada"
        )

    # Verificar acesso
    image_result = await db.execute(
        select(Image).where(Image.id == annotation.image_id)
    )
    image = image_result.scalar_one_or_none()

    from backend.models.project import Project
    project_result = await db.execute(
        select(Project).where(
            Project.id == image.project_id,
            Project.owner_id == current_user.id
        )
    )
    if not project_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado"
        )

    await db.delete(annotation)
    await db.commit()
