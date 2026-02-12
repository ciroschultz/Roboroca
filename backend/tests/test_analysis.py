"""
Tests for analysis endpoints.
"""

import io
import pytest
from httpx import AsyncClient
from PIL import Image as PILImage


def create_vegetation_image(width=200, height=200) -> bytes:
    """Create a test image with green vegetation colors."""
    img = PILImage.new("RGB", (width, height), (30, 120, 30))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf.getvalue()


async def upload_test_image(client: AsyncClient, auth_headers: dict, project_id: int) -> int:
    """Helper: upload a test image and return its ID."""
    image_data = create_vegetation_image()
    response = await client.post(
        "/images/upload",
        files={"file": ("vegetation.jpg", image_data, "image/jpeg")},
        data={"project_id": str(project_id)},
        headers=auth_headers,
    )
    assert response.status_code == 201
    return response.json()["image"]["id"]


@pytest.mark.asyncio
async def test_analyze_vegetation(client: AsyncClient, auth_headers, test_project):
    """Test vegetation analysis endpoint."""
    image_id = await upload_test_image(client, auth_headers, test_project.id)

    response = await client.post(
        f"/analysis/vegetation/{image_id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["analysis_type"] == "vegetation"
    assert data["status"] == "completed"
    assert "vegetation_percentage" in data["results"]["coverage"]


@pytest.mark.asyncio
async def test_analyze_plant_health(client: AsyncClient, auth_headers, test_project):
    """Test plant health analysis endpoint."""
    image_id = await upload_test_image(client, auth_headers, test_project.id)

    response = await client.post(
        f"/analysis/plant-health/{image_id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["analysis_type"] == "plant_health"
    assert data["status"] == "completed"
    assert "health_index" in data["results"]


@pytest.mark.asyncio
async def test_analyze_colors(client: AsyncClient, auth_headers, test_project):
    """Test color analysis endpoint."""
    image_id = await upload_test_image(client, auth_headers, test_project.id)

    response = await client.post(
        f"/analysis/colors/{image_id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["analysis_type"] == "colors"
    assert data["status"] == "completed"
    assert "statistics" in data["results"]


@pytest.mark.asyncio
async def test_ndvi_proxy(client: AsyncClient, auth_headers, test_project):
    """Test NDVI proxy (ExG) endpoint - was 501, now implemented."""
    image_id = await upload_test_image(client, auth_headers, test_project.id)

    response = await client.post(
        f"/analysis/ndvi/{image_id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["analysis_type"] == "ndvi_proxy"
    assert data["status"] == "completed"
    assert "statistics" in data["results"]
    assert "mean" in data["results"]["statistics"]
    assert "classification" in data["results"]


@pytest.mark.asyncio
async def test_plant_count(client: AsyncClient, auth_headers, test_project):
    """Test plant count endpoint - was 501, now implemented."""
    image_id = await upload_test_image(client, auth_headers, test_project.id)

    response = await client.post(
        f"/analysis/plant-count/{image_id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["analysis_type"] == "plant_count"
    assert data["status"] == "completed"
    assert "total_count" in data["results"]
    assert "locations" in data["results"]


@pytest.mark.asyncio
async def test_generate_heatmap(client: AsyncClient, auth_headers, test_project):
    """Test heatmap generation endpoint."""
    image_id = await upload_test_image(client, auth_headers, test_project.id)

    response = await client.post(
        f"/analysis/heatmap/{image_id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/jpeg"


@pytest.mark.asyncio
async def test_generate_full_report(client: AsyncClient, auth_headers, test_project):
    """Test full report generation endpoint."""
    image_id = await upload_test_image(client, auth_headers, test_project.id)

    response = await client.post(
        f"/analysis/report/{image_id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["analysis_type"] == "full_report"
    assert data["status"] == "completed"
    assert "vegetation_coverage" in data["results"]
    assert "vegetation_health" in data["results"]
    assert "recommendations" in data["results"]


@pytest.mark.asyncio
async def test_list_analyses(client: AsyncClient, auth_headers, test_project):
    """Test listing analyses."""
    image_id = await upload_test_image(client, auth_headers, test_project.id)

    # Create an analysis first
    await client.post(f"/analysis/vegetation/{image_id}", headers=auth_headers)

    # List analyses
    response = await client.get("/analysis/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_list_analyses_by_project(client: AsyncClient, auth_headers, test_project):
    """Test listing analyses filtered by project."""
    image_id = await upload_test_image(client, auth_headers, test_project.id)
    await client.post(f"/analysis/vegetation/{image_id}", headers=auth_headers)

    response = await client.get(
        f"/analysis/?project_id={test_project.id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_get_analysis(client: AsyncClient, auth_headers, test_project):
    """Test getting a single analysis."""
    image_id = await upload_test_image(client, auth_headers, test_project.id)

    # Create analysis
    create_resp = await client.post(
        f"/analysis/vegetation/{image_id}", headers=auth_headers
    )
    analysis_id = create_resp.json()["id"]

    # Get it
    response = await client.get(f"/analysis/{analysis_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == analysis_id


@pytest.mark.asyncio
async def test_delete_analysis(client: AsyncClient, auth_headers, test_project):
    """Test deleting an analysis."""
    image_id = await upload_test_image(client, auth_headers, test_project.id)

    create_resp = await client.post(
        f"/analysis/vegetation/{image_id}", headers=auth_headers
    )
    analysis_id = create_resp.json()["id"]

    # Delete
    response = await client.delete(f"/analysis/{analysis_id}", headers=auth_headers)
    assert response.status_code == 204

    # Verify gone
    response = await client.get(f"/analysis/{analysis_id}", headers=auth_headers)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_analysis_unauthorized(client: AsyncClient, test_project):
    """Test analysis without auth fails."""
    response = await client.post("/analysis/vegetation/1")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_analysis_nonexistent_image(client: AsyncClient, auth_headers):
    """Test analysis on non-existent image fails."""
    response = await client.post(
        "/analysis/vegetation/99999",
        headers=auth_headers,
    )
    assert response.status_code == 404
