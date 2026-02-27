"""
Images Routes
Endpoints para upload e gerenciamento de imagens.
"""

import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Optional, List

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field as PydField
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

# Serviços de processamento de imagens
from backend.services.image_processing import (
    read_metadata,
    save_thumbnail,
    is_video_file,
    get_video_thumbnail,
    get_video_metadata,
)

from backend.utils.files import IMAGE_EXTENSIONS, VIDEO_EXTENSIONS, is_image_file

router = APIRouter(prefix="/images")

# Extensões permitidas
ALLOWED_EXTENSIONS = IMAGE_EXTENSIONS | VIDEO_EXTENSIONS

# Tamanhos máximos por tipo
MAX_IMAGE_SIZE = 50 * 1024 * 1024    # 50MB para imagens
MAX_VIDEO_SIZE = 500 * 1024 * 1024   # 500MB para vídeos

# Content types válidos
ALLOWED_IMAGE_CONTENT_TYPES = {
    'image/jpeg', 'image/png', 'image/tiff', 'image/geotiff',
    'image/x-tiff', 'application/octet-stream',  # fallback para .tif/.geotiff
}
ALLOWED_VIDEO_CONTENT_TYPES = {
    'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
    'application/octet-stream',  # fallback
}


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
    Upload de imagem ou vídeo (drone ou satélite).

    Formatos aceitos: GeoTIFF, TIFF, JPEG, PNG, MOV, MP4
    Tamanho máximo: 500MB

    O sistema extrai automaticamente:
    - Metadados GPS (latitude, longitude, altitude)
    - Dimensões da imagem
    - Informações da câmera/drone
    - Gera thumbnail
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
    thumbnails_dir = os.path.join(upload_dir, "thumbnails")
    os.makedirs(upload_dir, exist_ok=True)
    os.makedirs(thumbnails_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, unique_filename)

    # Validar content_type
    is_video = ext in VIDEO_EXTENSIONS

    if file.content_type and file.content_type != 'application/octet-stream':
        allowed_types = ALLOWED_VIDEO_CONTENT_TYPES if is_video else ALLOWED_IMAGE_CONTENT_TYPES
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tipo de arquivo inválido: {file.content_type}"
            )

    # Salvar arquivo
    try:
        content = await file.read()
        file_size = len(content)

        # Verificar tamanho com limite específico por tipo
        max_size = MAX_VIDEO_SIZE if is_video else MAX_IMAGE_SIZE
        if file_size > max_size:
            max_mb = max_size / 1024 / 1024
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Arquivo muito grande ({file_size / 1024 / 1024:.1f}MB). Máximo para {'vídeos' if is_video else 'imagens'}: {max_mb:.0f}MB"
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

    # Extrair metadados e criar thumbnail
    width = None
    height = None
    center_lat = None
    center_lon = None
    capture_date = None
    thumbnail_path = None
    file_type = "image"

    try:
        if is_image_file(file.filename):
            # Processar imagem
            metadata = read_metadata(file_path)
            width = metadata.get('width')
            height = metadata.get('height')
            center_lat = metadata.get('gps_latitude')
            center_lon = metadata.get('gps_longitude')
            capture_date = metadata.get('capture_date')

            # Gerar thumbnail
            thumb_filename = f"{os.path.splitext(unique_filename)[0]}_thumb.jpg"
            thumb_path = os.path.join(thumbnails_dir, thumb_filename)
            try:
                save_thumbnail(file_path, thumb_path, size=(400, 400))
                thumbnail_path = thumb_path
            except Exception as e:
                logger.warning("Failed to generate thumbnail for %s: %s", file.filename, e)

        elif is_video_file(file_path):
            # Processar vídeo
            file_type = "video"
            try:
                video_meta = get_video_metadata(file_path)
                width = video_meta.get('width')
                height = video_meta.get('height')

                # Gerar thumbnail do vídeo
                thumb_filename = f"{os.path.splitext(unique_filename)[0]}_thumb.jpg"
                thumb_path = os.path.join(thumbnails_dir, thumb_filename)
                try:
                    get_video_thumbnail(file_path, thumb_path)
                    thumbnail_path = thumb_path
                except Exception as e:
                    logger.warning("Failed to generate video thumbnail for %s: %s", file.filename, e)
            except Exception as e:
                logger.warning("Failed to extract video metadata for %s: %s", file.filename, e)

    except Exception as e:
        logger.warning("Failed to extract metadata for %s: %s", file.filename, e)

    # Criar registro no banco
    image = Image(
        filename=unique_filename,
        original_filename=file.filename,
        file_path=file_path,
        file_size=file_size,
        mime_type=file.content_type,
        image_type=image_type,
        source=source or file_type,
        width=width,
        height=height,
        center_lat=center_lat,
        center_lon=center_lon,
        capture_date=capture_date,
        project_id=project_id,
        status="uploaded"
    )

    db.add(image)
    await db.commit()
    await db.refresh(image)

    # Atualizar coordenadas do projeto se for a primeira imagem com GPS
    if center_lat and center_lon and not project.latitude:
        project.latitude = center_lat
        project.longitude = center_lon
        await db.commit()

    return UploadResponse(
        message="Upload realizado com sucesso",
        image=image
    )


@router.post("/upload-multiple", status_code=status.HTTP_201_CREATED)
async def upload_multiple_images(
    files: List[UploadFile] = File(...),
    project_id: int = Form(...),
    image_type: str = Form(default="drone"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload de múltiplas imagens de uma vez.

    Retorna lista de imagens criadas e erros (se houver).
    """
    # Verificar se projeto existe
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

    uploaded_images: list[Image] = []
    errors = []

    for file in files:
        try:
            # Validar extensão
            if not file.filename or not validate_file_extension(file.filename):
                errors.append({
                    "filename": file.filename or "unknown",
                    "error": "Formato não suportado"
                })
                continue

            # Gerar nome único
            ext = os.path.splitext(file.filename)[1].lower()
            unique_filename = f"{uuid.uuid4()}{ext}"

            # Criar diretórios
            upload_dir = os.path.join(settings.UPLOAD_DIR, str(current_user.id), str(project_id))
            thumbnails_dir = os.path.join(upload_dir, "thumbnails")
            os.makedirs(upload_dir, exist_ok=True)
            os.makedirs(thumbnails_dir, exist_ok=True)

            file_path = os.path.join(upload_dir, unique_filename)

            # Salvar arquivo
            content = await file.read()
            file_size = len(content)

            file_ext = os.path.splitext(file.filename)[1].lower()
            file_is_video = file_ext in VIDEO_EXTENSIONS
            file_max_size = MAX_VIDEO_SIZE if file_is_video else MAX_IMAGE_SIZE
            if file_size > file_max_size:
                max_mb = file_max_size / 1024 / 1024
                errors.append({
                    "filename": file.filename,
                    "error": f"Arquivo muito grande ({file_size / 1024 / 1024:.1f}MB). Máximo: {max_mb:.0f}MB"
                })
                continue

            with open(file_path, "wb") as f:
                f.write(content)

            # Extrair metadados
            width = None
            height = None
            center_lat = None
            center_lon = None
            capture_date = None

            if is_image_file(file.filename):
                try:
                    metadata = read_metadata(file_path)
                    width = metadata.get('width')
                    height = metadata.get('height')
                    center_lat = metadata.get('gps_latitude')
                    center_lon = metadata.get('gps_longitude')
                    capture_date = metadata.get('capture_date')

                    # Gerar thumbnail
                    thumb_filename = f"{os.path.splitext(unique_filename)[0]}_thumb.jpg"
                    thumb_path = os.path.join(thumbnails_dir, thumb_filename)
                    try:
                        save_thumbnail(file_path, thumb_path, size=(400, 400))
                    except Exception as e:
                        logger.warning("Failed to generate thumbnail for %s: %s", file.filename, e)
                except Exception as e:
                    logger.warning("Failed to extract metadata for %s: %s", file.filename, e)

            # Criar registro
            image = Image(
                filename=unique_filename,
                original_filename=file.filename,
                file_path=file_path,
                file_size=file_size,
                mime_type=file.content_type,
                image_type=image_type,
                width=width,
                height=height,
                center_lat=center_lat,
                center_lon=center_lon,
                capture_date=capture_date,
                project_id=project_id,
                status="uploaded"
            )

            db.add(image)
            uploaded_images.append(image)

        except Exception as e:
            errors.append({
                "filename": file.filename or "unknown",
                "error": str(e)
            })

    # Commit em lote
    await db.commit()

    # Refresh para obter IDs gerados
    for img in uploaded_images:
        await db.refresh(img)

    # Atualizar coordenadas do projeto se for a primeira imagem com GPS
    if not project.latitude:
        for img in uploaded_images:
            if img.center_lat and img.center_lon:
                project.latitude = img.center_lat
                project.longitude = img.center_lon
                await db.commit()
                break

    return {
        "message": f"{len(uploaded_images)} arquivo(s) enviado(s) com sucesso",
        "uploaded_count": len(uploaded_images),
        "error_count": len(errors),
        "errors": errors if errors else None,
        "image_ids": [img.id for img in uploaded_images],
    }


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


@router.get("/{image_id}/thumbnail")
async def get_image_thumbnail(
    image_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obter thumbnail da imagem."""
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

    # Procurar thumbnail
    thumb_filename = f"{os.path.splitext(image.filename)[0]}_thumb.jpg"
    thumb_dir = os.path.join(os.path.dirname(image.file_path), "thumbnails")
    thumb_path = os.path.join(thumb_dir, thumb_filename)

    if os.path.exists(thumb_path):
        return FileResponse(thumb_path, media_type="image/jpeg")

    # Se não existir thumbnail, gerar agora
    try:
        os.makedirs(thumb_dir, exist_ok=True)
        if is_image_file(image.original_filename):
            save_thumbnail(image.file_path, thumb_path)
        else:
            get_video_thumbnail(image.file_path, thumb_path)
        return FileResponse(thumb_path, media_type="image/jpeg")
    except Exception as e:
        logger.warning("Failed to generate thumbnail for image %s: %s", image_id, e)
        # Fallback: serve original file if it's an image
        if is_image_file(image.original_filename) and os.path.exists(image.file_path):
            return FileResponse(
                image.file_path,
                media_type=image.mime_type or "application/octet-stream",
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thumbnail não disponível"
        )


@router.get("/{image_id}/file")
async def get_image_file(
    image_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Servir o arquivo original da imagem."""
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
            detail="Arquivo não encontrado no disco"
        )

    return FileResponse(
        image.file_path,
        media_type=image.mime_type or "application/octet-stream",
        filename=image.original_filename,
    )


@router.get("/{image_id}/original")
async def get_image_original(
    image_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Servir o arquivo original da imagem (backup sem overlay).

    Se o overlay foi aplicado, o backup _original foi salvo ao lado.
    Se não existir backup, serve o arquivo normal (fallback).
    """
    from pathlib import Path

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

    # Tentar encontrar o backup _original
    file_path = Path(image.file_path)
    original_path = file_path.with_name(f"{file_path.stem}_original{file_path.suffix}")

    if original_path.exists():
        return FileResponse(
            str(original_path),
            media_type=image.mime_type or "application/octet-stream",
            filename=image.original_filename,
        )

    # Fallback: serve o arquivo normal (sem overlay ou overlay não aplicado)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arquivo não encontrado no disco"
        )

    return FileResponse(
        str(file_path),
        media_type=image.mime_type or "application/octet-stream",
        filename=image.original_filename,
    )


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


@router.get("/clusters/by-project")
async def get_image_clusters(
    project_id: int = Query(..., description="ID do projeto"),
    radius_m: float = Query(50.0, ge=1.0, le=10000.0, description="Raio de agrupamento em metros"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Agrupar imagens de um projeto por proximidade GPS.

    Retorna clusters de imagens que estão dentro do raio especificado.
    Útil para identificar imagens do mesmo local/talhão.
    """
    from backend.services.geo.clustering import cluster_images_by_location

    # Verificar que o projeto pertence ao usuário
    project_result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.owner_id == current_user.id
        )
    )
    project = project_result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projeto não encontrado"
        )

    # Buscar imagens com GPS
    images_result = await db.execute(
        select(Image).where(
            Image.project_id == project_id,
            Image.center_lat.isnot(None),
            Image.center_lon.isnot(None)
        )
    )
    images = images_result.scalars().all()

    if not images:
        return {
            "project_id": project_id,
            "total_images_with_gps": 0,
            "clusters": [],
            "radius_m": radius_m,
        }

    # Preparar dados para o clustering
    image_data = [
        {
            "id": img.id,
            "latitude": img.center_lat,
            "longitude": img.center_lon,
            "filename": img.original_filename,
        }
        for img in images
    ]

    clusters = cluster_images_by_location(image_data, radius_m=radius_m)

    return {
        "project_id": project_id,
        "total_images_with_gps": len(images),
        "total_clusters": len(clusters),
        "clusters": clusters,
        "radius_m": radius_m,
    }


@router.get("/{image_id}/gsd")
async def get_image_gsd(
    image_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obter o GSD (Ground Sample Distance) da imagem em metros/pixel.

    O GSD é calculado a partir dos metadados XMP da imagem (altitude, modelo da câmera).
    Se não for possível calcular, retorna um valor padrão estimado.
    """
    from backend.api.routes.projects import get_image_gsd_from_xmp

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

    # Tentar obter GSD real dos metadados XMP
    gsd_m = None
    if image.file_path:
        gsd_m = get_image_gsd_from_xmp(image.file_path)

    # Fallback: 3cm/pixel (drone típico a ~100m de altitude)
    if not gsd_m:
        gsd_m = 0.03

    return {
        "image_id": image_id,
        "gsd_m": gsd_m,
        "gsd_cm": gsd_m * 100,
        "width": image.width,
        "height": image.height,
        "is_estimated": gsd_m == 0.03,
    }


@router.get("/{image_id}/utm-info")
async def get_image_utm_info(
    image_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Obter informações UTM (coordenadas projetadas) da imagem.

    Retorna zona UTM, coordenadas do centro e dos 4 cantos.
    Se a imagem não tem GPS, retorna has_gps: false.
    """
    from backend.services.geo import latlon_to_utm, get_image_utm_corners
    from backend.api.routes.projects import get_image_gsd_from_xmp

    result = await db.execute(
        select(Image)
        .where(Image.id == image_id)
        .where(Image.project.has(Project.owner_id == current_user.id))
    )
    image = result.scalar_one_or_none()

    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imagem não encontrada",
        )

    if not image.center_lat or not image.center_lon:
        return {"has_gps": False, "image_id": image_id}

    # GSD
    gsd_m = None
    if image.file_path:
        gsd_m = get_image_gsd_from_xmp(image.file_path)
    if not gsd_m:
        gsd_m = 0.03  # fallback

    # Converter centro para UTM
    center_utm = latlon_to_utm(image.center_lat, image.center_lon)

    # Calcular cantos se tiver dimensões
    corners = None
    if image.width and image.height:
        corners_data = get_image_utm_corners(
            image.center_lat, image.center_lon,
            image.width, image.height, gsd_m,
        )
        corners = corners_data

    return {
        "has_gps": True,
        "image_id": image_id,
        "utm_zone": center_utm["zone"],
        "center": {
            "easting": center_utm["easting"],
            "northing": center_utm["northing"],
        },
        "corners": corners,
        "gsd_m": gsd_m,
        "gsd_cm": gsd_m * 100,
    }


class SaveImagePerimeterRequest(BaseModel):
    perimeter_polygon: list  # [[x, y], ...] normalizado 0-1


@router.put("/{image_id}/perimeter")
async def save_image_perimeter(
    image_id: int,
    body: SaveImagePerimeterRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Salvar perímetro (polígono normalizado 0-1) específico de uma imagem."""
    result = await db.execute(
        select(Image)
        .where(Image.id == image_id)
        .where(Image.project.has(Project.owner_id == current_user.id))
    )
    image = result.scalar_one_or_none()

    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imagem não encontrada",
        )

    image.perimeter_polygon = body.perimeter_polygon
    await db.commit()
    await db.refresh(image)

    return {
        "image_id": image.id,
        "perimeter_polygon": image.perimeter_polygon,
        "message": "Perímetro salvo com sucesso",
    }


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
        except Exception as e:
            logger.warning("Failed to delete file %s: %s", image.file_path, e)

    # Remover thumbnail
    thumb_filename = f"{os.path.splitext(image.filename)[0]}_thumb.jpg"
    thumb_dir = os.path.join(os.path.dirname(image.file_path), "thumbnails")
    thumb_path = os.path.join(thumb_dir, thumb_filename)
    if os.path.exists(thumb_path):
        try:
            os.remove(thumb_path)
        except Exception as e:
            logger.warning("Failed to delete thumbnail %s: %s", thumb_path, e)

    await db.delete(image)
    await db.commit()


# ============================================
# CAPTURE FROM COORDINATES
# ============================================

class CaptureFromCoordinatesRequest(BaseModel):
    latitude: float = PydField(..., ge=-90, le=90)
    longitude: float = PydField(..., ge=-180, le=180)
    radius_m: float = PydField(default=500, ge=50, le=50000)
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    provider: str = PydField(default="esri")
    zoom: Optional[int] = None


@router.post("/capture-from-coordinates")
async def capture_from_coordinates(
    body: CaptureFromCoordinatesRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Capturar imagem de satélite a partir de coordenadas GPS.

    Busca uma imagem aérea/satélite do provedor especificado,
    salva como imagem do projeto e retorna os dados da imagem.
    """
    from backend.services.external.satellite_imagery import (
        fetch_satellite_image,
        get_available_providers,
    )

    # Criar novo projeto para a captura GPS ou usar existente
    if body.project_id:
        project_result = await db.execute(
            select(Project).where(
                Project.id == body.project_id,
                Project.owner_id == current_user.id,
            )
        )
        project = project_result.scalar_one_or_none()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Projeto não encontrado",
            )
    else:
        # Criar novo projeto automaticamente
        from datetime import datetime, timezone as tz
        project_name = body.project_name or f"Captura GPS {body.latitude:.4f}, {body.longitude:.4f}"
        project = Project(
            name=project_name,
            description=f"Projeto criado automaticamente via captura de satélite ({body.provider})",
            status="pending",
            latitude=body.latitude,
            longitude=body.longitude,
            owner_id=current_user.id,
        )
        db.add(project)
        await db.flush()  # Gerar ID

    # Diretório do projeto para salvar a imagem
    project_upload_dir = os.path.join(settings.UPLOAD_DIR, str(current_user.id), str(project.id))
    os.makedirs(project_upload_dir, exist_ok=True)

    # Buscar imagem do provedor
    try:
        import asyncio
        result = await fetch_satellite_image(
            lat=body.latitude,
            lon=body.longitude,
            radius_m=body.radius_m,
            provider=body.provider,
            upload_dir=project_upload_dir,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error("Erro ao capturar imagem de satélite: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erro ao buscar imagem do provedor: {str(e)}",
        )

    # Criar registro de imagem no banco
    image = Image(
        filename=result["filename"],
        original_filename=f"satellite_{body.provider}_{body.latitude:.4f}_{body.longitude:.4f}.png",
        file_path=result["file_path"],
        file_size=result["file_size"],
        mime_type="image/png",
        image_type="satellite",
        source=result["provider"],
        width=result["dimensions"]["width"],
        height=result["dimensions"]["height"],
        center_lat=body.latitude,
        center_lon=body.longitude,
        resolution=result["gsd_m"],
        project_id=project.id,
        status="uploaded",
    )
    db.add(image)

    # Gerar thumbnail
    try:
        thumb_dir = os.path.join(project_upload_dir, "thumbnails")
        os.makedirs(thumb_dir, exist_ok=True)
        thumb_filename = f"{os.path.splitext(result['filename'])[0]}_thumb.jpg"
        thumb_path = os.path.join(thumb_dir, thumb_filename)
        save_thumbnail(result["file_path"], thumb_path, size=(400, 400))
    except Exception as thumb_err:
        logger.warning("Falha ao gerar thumbnail: %s", thumb_err)

    # Atualizar coordenadas do projeto se não definidas
    if not project.latitude:
        project.latitude = body.latitude
        project.longitude = body.longitude

    await db.commit()
    await db.refresh(image)

    return {
        "id": image.id,
        "filename": image.filename,
        "original_filename": image.original_filename,
        "file_size": image.file_size,
        "image_type": image.image_type,
        "source": image.source,
        "width": image.width,
        "height": image.height,
        "center_lat": image.center_lat,
        "center_lon": image.center_lon,
        "gsd_m": result["gsd_m"],
        "provider": result["provider"],
        "bbox": result["bbox"],
        "radius_m": result["radius_m"],
        "project_id": image.project_id,
        "status": image.status,
        "message": f"Imagem capturada com sucesso via {result['provider']}",
    }


@router.get("/capture/providers")
async def get_capture_providers(
    current_user: User = Depends(get_current_user),
):
    """Listar provedores de imagens de satélite disponíveis."""
    from backend.services.external.satellite_imagery import get_available_providers
    return {"providers": get_available_providers()}
