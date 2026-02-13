"""
Annotation GeoJSON export tests.
"""

import pytest
from datetime import datetime, timezone
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.user import User
from backend.models.project import Project
from backend.models.image import Image
from backend.models.annotation import Annotation
from backend.core.security import get_password_hash, create_access_token


# ============================================
# Fixtures
# ============================================

@pytest.fixture
async def image_with_annotations(
    db_session: AsyncSession, test_user: User, test_project: Project
) -> tuple[Image, list[Annotation]]:
    """Create image with various annotation types."""
    image = Image(
        filename="annotated.jpg",
        original_filename="annotated.jpg",
        file_path="/tmp/annotated.jpg",
        file_size=2048,
        mime_type="image/jpeg",
        image_type="drone",
        width=4000,
        height=3000,
        center_lat=-23.5505,
        center_lon=-46.6333,
        status="analyzed",
        project_id=test_project.id,
    )
    db_session.add(image)
    await db_session.commit()
    await db_session.refresh(image)

    annotations = []
    # Point
    a1 = Annotation(
        image_id=image.id,
        annotation_type="point",
        data={"x": 100, "y": 200, "label": "Ponto 1", "color": "#FF0000"},
        created_by=test_user.id,
    )
    db_session.add(a1)
    # Polygon
    a2 = Annotation(
        image_id=image.id,
        annotation_type="polygon",
        data={"points": [[10, 10], [100, 10], [100, 100], [10, 100]], "label": "Area", "color": "#00FF00"},
        created_by=test_user.id,
    )
    db_session.add(a2)
    # Measurement
    a3 = Annotation(
        image_id=image.id,
        annotation_type="measurement",
        data={"start": {"x": 50, "y": 50}, "end": {"x": 200, "y": 200}, "label": "5.2m", "color": "#0000FF"},
        created_by=test_user.id,
    )
    db_session.add(a3)

    await db_session.commit()
    for a in [a1, a2, a3]:
        await db_session.refresh(a)

    return image, [a1, a2, a3]


# ============================================
# GET /annotations/export/geojson
# ============================================

@pytest.mark.asyncio
async def test_geojson_export_by_image(
    client: AsyncClient, auth_headers: dict, image_with_annotations
):
    """Export GeoJSON for a specific image returns valid FeatureCollection."""
    image, annotations = image_with_annotations
    response = await client.get(
        f"/annotations/export/geojson?image_id={image.id}", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) == 3
    # Check feature types
    types = {f["geometry"]["type"] for f in data["features"]}
    assert "Point" in types
    assert "Polygon" in types
    assert "LineString" in types


@pytest.mark.asyncio
async def test_geojson_export_by_project(
    client: AsyncClient, auth_headers: dict, image_with_annotations, test_project: Project
):
    """Export GeoJSON for a project returns all annotations."""
    response = await client.get(
        f"/annotations/export/geojson?project_id={test_project.id}", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) == 3


@pytest.mark.asyncio
async def test_geojson_export_empty(
    client: AsyncClient, auth_headers: dict, test_project: Project
):
    """Export GeoJSON for project with no annotations returns empty collection."""
    response = await client.get(
        f"/annotations/export/geojson?project_id={test_project.id}", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert data["features"] == []


@pytest.mark.asyncio
async def test_geojson_export_no_params(client: AsyncClient, auth_headers: dict):
    """Export GeoJSON without image_id or project_id returns 400."""
    response = await client.get("/annotations/export/geojson", headers=auth_headers)
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_geojson_export_auth_required(client: AsyncClient, test_project: Project):
    """Export GeoJSON requires authentication."""
    response = await client.get(
        f"/annotations/export/geojson?project_id={test_project.id}"
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_geojson_export_gps_coordinates(
    client: AsyncClient, auth_headers: dict, image_with_annotations
):
    """Images with GPS should produce GeoJSON with geographic CRS."""
    image, _ = image_with_annotations
    response = await client.get(
        f"/annotations/export/geojson?image_id={image.id}", headers=auth_headers
    )
    data = response.json()
    # Image has GPS so CRS should be geographic
    assert "CRS84" in data["crs"]["properties"]["name"]
    # Coordinates should be in lon/lat range
    point_feature = next(f for f in data["features"] if f["geometry"]["type"] == "Point")
    lon, lat = point_feature["geometry"]["coordinates"]
    assert -180 <= lon <= 180
    assert -90 <= lat <= 90
