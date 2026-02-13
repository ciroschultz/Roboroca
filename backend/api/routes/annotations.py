"""
Annotations Routes
Endpoints para gerenciamento de anotacoes de mapa.
"""

from typing import Optional, List
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from backend.core.database import get_db
from backend.models.user import User
from backend.models.image import Image
from backend.models.annotation import Annotation
from backend.models.project import Project
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


@router.get("/export/geojson")
async def export_annotations_geojson(
    image_id: Optional[int] = Query(None, description="ID da imagem"),
    project_id: Optional[int] = Query(None, description="ID do projeto (todas as anotacoes)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Exportar anotacoes como GeoJSON FeatureCollection.

    - Se `image_id` fornecido: exporta anotacoes daquela imagem
    - Se `project_id` fornecido: exporta todas as anotacoes do projeto
    - Para imagens com GPS: converte pixels para lat/lon aproximado
    - Para imagens sem GPS: exporta coordenadas em pixels com crs: image-pixel

    O GeoJSON gerado pode ser importado em QGIS, Google Earth, etc.
    """
    if not image_id and not project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe image_id ou project_id"
        )

    # Buscar imagens alvo
    if image_id:
        img_result = await db.execute(select(Image).where(Image.id == image_id))
        image = img_result.scalar_one_or_none()
        if not image:
            raise HTTPException(status_code=404, detail="Imagem nao encontrada")

        proj_result = await db.execute(
            select(Project).where(Project.id == image.project_id, Project.owner_id == current_user.id)
        )
        if not proj_result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Acesso negado")

        target_images = [image]
    else:
        proj_result = await db.execute(
            select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
        )
        if not proj_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Projeto nao encontrado")

        imgs_result = await db.execute(select(Image).where(Image.project_id == project_id))
        target_images = imgs_result.scalars().all()

    # Buscar anotacoes de todas as imagens alvo
    image_ids = [img.id for img in target_images]
    image_map = {img.id: img for img in target_images}

    if not image_ids:
        return _build_geojson([], "image-pixel")

    ann_result = await db.execute(
        select(Annotation)
        .where(Annotation.image_id.in_(image_ids))
        .order_by(Annotation.created_at.asc())
    )
    annotations = ann_result.scalars().all()

    # Determinar CRS: se alguma imagem tem GPS, usar geo coords
    has_gps = any(img.center_lat and img.center_lon for img in target_images)

    features = []
    for ann in annotations:
        img = image_map.get(ann.image_id)
        feature = _annotation_to_feature(ann, img, use_gps=has_gps)
        if feature:
            features.append(feature)

    crs = "urn:ogc:def:crs:OGC:1.3:CRS84" if has_gps else "image-pixel"
    return _build_geojson(features, crs)


def _build_geojson(features: list, crs: str) -> dict:
    """Construir GeoJSON FeatureCollection."""
    return {
        "type": "FeatureCollection",
        "crs": {"type": "name", "properties": {"name": crs}},
        "features": features,
    }


def _pixel_to_latlon(
    px: float, py: float, img_center_lat: float, img_center_lon: float,
    img_width: int, img_height: int, gsd_m: float = 0.03
) -> tuple[float, float]:
    """
    Converter coordenada de pixel para lat/lon aproximado.

    Usa o centro GPS da imagem como referencia e o GSD para calcular offsets.
    """
    import math
    # Offset em pixels do centro da imagem
    dx_px = px - img_width / 2
    dy_px = py - img_height / 2

    # Converter para metros
    dx_m = dx_px * gsd_m
    dy_m = -dy_px * gsd_m  # Y invertido (pixel Y cresce pra baixo)

    # Converter metros para graus
    # 1 grau lat ≈ 111320m, 1 grau lon ≈ 111320m * cos(lat)
    dlat = dy_m / 111320.0
    dlon = dx_m / (111320.0 * math.cos(math.radians(img_center_lat)))

    return (img_center_lat + dlat, img_center_lon + dlon)


def _annotation_to_feature(ann, img, use_gps: bool) -> dict | None:
    """Converter uma anotacao em GeoJSON Feature."""
    data = ann.data or {}
    properties = {
        "annotation_id": ann.id,
        "type": ann.annotation_type,
        "label": data.get("label"),
        "color": data.get("color"),
        "image_id": ann.image_id,
        "created_at": ann.created_at.isoformat() if ann.created_at else None,
    }

    has_img_gps = img and img.center_lat and img.center_lon and img.width and img.height

    def to_coord(px, py):
        if use_gps and has_img_gps:
            lat, lon = _pixel_to_latlon(px, py, img.center_lat, img.center_lon, img.width, img.height)
            return [lon, lat]  # GeoJSON is [lon, lat]
        return [px, py]

    if ann.annotation_type == "point":
        if data.get("x") is not None and data.get("y") is not None:
            coord = to_coord(data["x"], data["y"])
            return {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": coord},
                "properties": properties,
            }

    elif ann.annotation_type == "polygon":
        points = data.get("points", [])
        if len(points) >= 3:
            coords = [to_coord(p[0], p[1]) for p in points]
            coords.append(coords[0])  # Close the ring
            properties["area_m2"] = data.get("areaM2")
            return {
                "type": "Feature",
                "geometry": {"type": "Polygon", "coordinates": [coords]},
                "properties": properties,
            }

    elif ann.annotation_type == "measurement":
        start = data.get("start")
        end = data.get("end")
        if start and end:
            coords = [to_coord(start["x"], start["y"]), to_coord(end["x"], end["y"])]
            properties["distance_m"] = data.get("distanceM") or data.get("distance_meters")
            return {
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": coords},
                "properties": properties,
            }

    elif ann.annotation_type == "circle":
        center = data.get("center")
        if center:
            coord = to_coord(center["x"], center["y"])
            properties["radius_pixels"] = data.get("radius")
            return {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": coord},
                "properties": properties,
            }

    elif ann.annotation_type == "rectangle":
        x = data.get("x", 0)
        y = data.get("y", 0)
        w = data.get("width", 0)
        h = data.get("height", 0)
        if w and h:
            coords = [
                to_coord(x, y),
                to_coord(x + w, y),
                to_coord(x + w, y + h),
                to_coord(x, y + h),
                to_coord(x, y),  # Close the ring
            ]
            return {
                "type": "Feature",
                "geometry": {"type": "Polygon", "coordinates": [coords]},
                "properties": properties,
            }

    return None
