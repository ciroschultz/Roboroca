"""
Tests for UTM converter and UTM info endpoint.
"""

import os
import tempfile

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from PIL import Image as PILImage
import numpy as np

from backend.models.project import Project
from backend.models.image import Image as ImageModel
from backend.services.geo.utm_converter import latlon_to_utm, get_image_utm_corners


# ============================================
# Unit tests for utm_converter
# ============================================


def test_latlon_to_utm_sao_paulo():
    """Test conversion for Sao Paulo, Brazil (-23.55, -46.63)."""
    result = latlon_to_utm(-23.5505, -46.6333)

    assert result["hemisphere"] == "S"
    assert result["zone_number"] == 23
    assert result["zone"] == "23S"
    # Easting should be around 333000-334000 for this location
    assert 300000 < result["easting"] < 400000
    # Northing (with 10M offset) should be around 7.39M
    assert 7000000 < result["northing"] < 8000000


def test_latlon_to_utm_northern_hemisphere():
    """Test conversion for New York (40.71, -74.00)."""
    result = latlon_to_utm(40.7128, -74.0060)

    assert result["hemisphere"] == "N"
    assert result["zone_number"] == 18
    assert result["zone"] == "18N"
    assert 500000 < result["easting"] < 600000
    assert 4000000 < result["northing"] < 5000000


def test_get_image_utm_corners():
    """Test corner calculation from center + GSD."""
    result = get_image_utm_corners(
        center_lat=-23.5505,
        center_lon=-46.6333,
        width=1000,
        height=800,
        gsd_m=0.03,
    )

    assert "center" in result
    assert "top_left" in result
    assert "bottom_right" in result

    # Verify corners are symmetric around center
    center_e = result["center"]["easting"]
    center_n = result["center"]["northing"]

    # Half extents: 1000/2 * 0.03 = 15m, 800/2 * 0.03 = 12m
    assert abs(result["top_left"]["easting"] - (center_e - 15)) < 0.1
    assert abs(result["top_right"]["easting"] - (center_e + 15)) < 0.1
    assert abs(result["top_left"]["northing"] - (center_n + 12)) < 0.1
    assert abs(result["bottom_left"]["northing"] - (center_n - 12)) < 0.1


# ============================================
# Endpoint tests
# ============================================


@pytest_asyncio.fixture
async def test_image_with_gps(db_session: AsyncSession, test_project: Project):
    """Create a test image with GPS coordinates."""
    img_array = np.zeros((100, 100, 3), dtype=np.uint8)
    pil_img = PILImage.fromarray(img_array)

    tmpdir = tempfile.mkdtemp()
    file_path = os.path.join(tmpdir, "test_utm_image.jpg")
    pil_img.save(file_path, "JPEG")

    image = ImageModel(
        filename="test_utm_image.jpg",
        original_filename="test_utm_image.jpg",
        file_path=file_path,
        file_size=os.path.getsize(file_path),
        mime_type="image/jpeg",
        image_type="drone",
        width=1000,
        height=800,
        center_lat=-23.5505,
        center_lon=-46.6333,
        project_id=test_project.id,
        status="uploaded",
    )
    db_session.add(image)
    await db_session.commit()
    await db_session.refresh(image)

    yield image

    if os.path.exists(file_path):
        os.remove(file_path)
    os.rmdir(tmpdir)


@pytest_asyncio.fixture
async def test_image_without_gps(db_session: AsyncSession, test_project: Project):
    """Create a test image without GPS coordinates."""
    img_array = np.zeros((100, 100, 3), dtype=np.uint8)
    pil_img = PILImage.fromarray(img_array)

    tmpdir = tempfile.mkdtemp()
    file_path = os.path.join(tmpdir, "test_no_gps.jpg")
    pil_img.save(file_path, "JPEG")

    image = ImageModel(
        filename="test_no_gps.jpg",
        original_filename="test_no_gps.jpg",
        file_path=file_path,
        file_size=os.path.getsize(file_path),
        mime_type="image/jpeg",
        image_type="drone",
        width=500,
        height=400,
        center_lat=None,
        center_lon=None,
        project_id=test_project.id,
        status="uploaded",
    )
    db_session.add(image)
    await db_session.commit()
    await db_session.refresh(image)

    yield image

    if os.path.exists(file_path):
        os.remove(file_path)
    os.rmdir(tmpdir)


@pytest.mark.asyncio
async def test_utm_info_with_gps(
    client: AsyncClient,
    auth_headers: dict,
    test_image_with_gps: ImageModel,
):
    """Test UTM info endpoint returns data when image has GPS."""
    response = await client.get(
        f"/images/{test_image_with_gps.id}/utm-info",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["has_gps"] is True
    assert data["utm_zone"] == "23S"
    assert "center" in data
    assert data["center"]["easting"] > 0
    assert data["corners"] is not None


@pytest.mark.asyncio
async def test_utm_info_without_gps(
    client: AsyncClient,
    auth_headers: dict,
    test_image_without_gps: ImageModel,
):
    """Test UTM info endpoint returns has_gps=false when no GPS."""
    response = await client.get(
        f"/images/{test_image_without_gps.id}/utm-info",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["has_gps"] is False


@pytest.mark.asyncio
async def test_utm_info_image_not_found(
    client: AsyncClient,
    auth_headers: dict,
):
    """Test UTM info for nonexistent image returns 404."""
    response = await client.get(
        "/images/99999/utm-info",
        headers=auth_headers,
    )

    assert response.status_code == 404
