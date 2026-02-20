"""
Tests for ROI (Region of Interest) analysis endpoint.
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
from backend.tests.conftest import test_session_maker


@pytest_asyncio.fixture
async def test_image_with_file(db_session: AsyncSession, test_project: Project):
    """Create a test image with an actual file on disk."""
    # Create a small test image
    img_array = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
    # Add some green to simulate vegetation
    img_array[20:80, 20:80, 1] = 200
    pil_img = PILImage.fromarray(img_array)

    tmpdir = tempfile.mkdtemp()
    file_path = os.path.join(tmpdir, "test_roi_image.jpg")
    pil_img.save(file_path, "JPEG")

    image = ImageModel(
        filename="test_roi_image.jpg",
        original_filename="test_roi_image.jpg",
        file_path=file_path,
        file_size=os.path.getsize(file_path),
        mime_type="image/jpeg",
        image_type="drone",
        width=100,
        height=100,
        project_id=test_project.id,
        status="uploaded",
    )
    db_session.add(image)
    await db_session.commit()
    await db_session.refresh(image)

    yield image

    # Cleanup
    if os.path.exists(file_path):
        os.remove(file_path)
    os.rmdir(tmpdir)


@pytest.mark.asyncio
async def test_roi_analysis_valid_polygon(
    client: AsyncClient,
    auth_headers: dict,
    test_image_with_file: ImageModel,
):
    """Test ROI analysis with a valid polygon returns results with roi_metadata."""
    response = await client.post(
        f"/analysis/roi/{test_image_with_file.id}",
        json={
            "roi_polygon": [[10, 10], [90, 10], [90, 90], [10, 90]],
            "analyses": ["vegetation", "health"],
        },
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["analysis_type"] == "roi_analysis"
    assert "roi_metadata" in data["results"]
    assert data["results"]["roi_metadata"]["area_pixels"] > 0
    assert data["results"]["roi_metadata"]["num_vertices"] == 4
    assert "vegetation" in data["results"]
    assert "health" in data["results"]


@pytest.mark.asyncio
async def test_roi_analysis_invalid_polygon(
    client: AsyncClient,
    auth_headers: dict,
    test_image_with_file: ImageModel,
):
    """Test ROI analysis with less than 3 points returns 422."""
    response = await client.post(
        f"/analysis/roi/{test_image_with_file.id}",
        json={
            "roi_polygon": [[10, 10], [90, 10]],
            "analyses": ["vegetation"],
        },
        headers=auth_headers,
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_roi_analysis_image_not_found(
    client: AsyncClient,
    auth_headers: dict,
):
    """Test ROI analysis with nonexistent image returns 404."""
    response = await client.post(
        "/analysis/roi/99999",
        json={
            "roi_polygon": [[10, 10], [90, 10], [90, 90]],
            "analyses": ["vegetation"],
        },
        headers=auth_headers,
    )

    assert response.status_code == 404
