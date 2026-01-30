"""
Images Routes
Endpoints para upload e gerenciamento de imagens.
"""

import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from backend.core.database import get_db
from backend.core.config import settings
from backend.models.user import User
from backend.models.project import Project
from backend.models.image import Image
from backend.api.schemas.image import (
    ImageResponse,
    ImageListResponse,
    ImageMetadata,
    UploadResponse,
)
from backend.api.dependencies.auth import get_current_user

router = APIRouter(prefix="/images")

# Extensões permitidas
ALLOWED_EXTENSIONS = {".tif", ".tiff", ".jpg", ".jpeg", ".png", ".geotiff"}


def validate_file_extension(filename: str) -> bool:
    """Validar extensão do arquivo."""
    ext = os.path.splitext(filename)[1].lower()
    return ext in ALLOWED_EXTENSIONS


@router.get("/", response_model=ImageListResponse)
async def list_images(
    project_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Listar imagens do usuário, opcionalmente filtradas por projeto."""
    # Base query - imagens de projetos do usuário
    base_filter = Image.project.has(Project.owner_id == current_user.id)

    if project_id:
        base_filter = base_filter & (Image.project_id == project_id)

    # Contar total
    count_query = select(func.count(Image.id)).where(base_filter)
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Buscar imagens
    query = (
        select(Image)
        .where(base_filter)
        .offset(skip)
        .limit(limit)
        .order_by(Image.created_at.desc())
    )
    result = await db.execute(query)
    images = result.scalars().all()

    return ImageListResponse(images=images, total=total)


@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(...),
    project_id: int = Form(...),
    image_type: str = Form(default="drone"),
    source: Optional[str] = Form(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload de imagem (drone ou satélite).

    Formatos aceitos: GeoTIFF, TIFF, JPEG, PNG
    Tamanho máximo: 500MB
    """
    # Validar extensão
    if not file.filename or not validate_file_extension(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato não suportado. Use: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Verificar se projeto existe e pertence ao usuário
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

    # Gerar nome único para o arquivo
    ext = os.path.splitext(file.filename)[1].lower()
    unique_filename = f"{uuid.uuid4()}{ext}"

    # Criar diretório de upload se não existir
    upload_dir = os.path.join(settings.UPLOAD_DIR, str(current_user.id), str(project_id))
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, unique_filename)

    # Salvar arquivo
    try:
        content = await file.read()
        file_size = len(content)

        # Verificar tamanho
        if file_size > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Arquivo muito grande. Máximo: {settings.MAX_UPLOAD_SIZE / 1024 / 1024:.0f}MB"
            )

        with open(file_path, "wb") as f:
            f.write(content)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao salvar arquivo: {str(e)}"
        )

    # Criar registro no banco
    image = Image(
        filename=unique_filename,
        original_filename=file.filename,
        file_path=file_path,
        file_size=file_size,
        mime_type=file.content_type,
        image_type=image_type,
        source=source,
        project_id=project_id,
        status="uploaded"
    )

    db.add(image)
    await db.commit()
    await db.refresh(image)

    return UploadResponse(
        message="Upload realizado com sucesso",
        image=image
    )


@router.get("/{image_id}", response_model=ImageResponse)
async def get_image(
    image_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obter detalhes de uma imagem."""
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

    return image


@router.get("/{image_id}/metadata", response_model=ImageMetadata)
async def get_image_metadata(
    image_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obter metadados da imagem (dimensões, coordenadas, etc)."""
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

    return ImageMetadata(
        width=image.width,
        height=image.height,
        crs=image.crs,
        bounds=image.bounds,
        center_lat=image.center_lat,
        center_lon=image.center_lon,
        resolution=image.resolution,
        bands=image.bands,
        file_size=image.file_size
    )


@router.delete("/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_image(
    image_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Excluir imagem."""
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

    # Remover arquivo físico
    if os.path.exists(image.file_path):
        try:
            os.remove(image.file_path)
        except Exception:
            pass  # Ignorar erros ao remover arquivo

    await db.delete(image)
    await db.commit()
