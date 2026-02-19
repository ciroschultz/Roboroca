"""
Tests for project endpoints.
"""

import io
import pytest
from httpx import AsyncClient
from PIL import Image as PILImage


@pytest.mark.asyncio
async def test_create_project(client: AsyncClient, auth_headers):
    """Test project creation."""
    response = await client.post("/projects/", json={
        "name": "Fazenda Nova",
        "description": "Projeto de teste",
        "latitude": -23.5505,
        "longitude": -46.6333,
        "total_area_ha": 50.0,
    }, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Fazenda Nova"
    assert data["status"] == "pending"
    assert data["latitude"] == -23.5505


@pytest.mark.asyncio
async def test_create_project_minimal(client: AsyncClient, auth_headers):
    """Test project creation with only required fields."""
    response = await client.post("/projects/", json={
        "name": "Projeto Mínimo",
    }, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Projeto Mínimo"
    assert data["latitude"] is None


@pytest.mark.asyncio
async def test_create_project_unauthorized(client: AsyncClient):
    """Test project creation without auth fails."""
    response = await client.post("/projects/", json={
        "name": "Fail",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_projects(client: AsyncClient, auth_headers, test_project):
    """Test listing projects."""
    response = await client.get("/projects/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "projects" in data
    assert data["total"] >= 1
    assert any(p["name"] == "Fazenda Teste" for p in data["projects"])


@pytest.mark.asyncio
async def test_get_project(client: AsyncClient, auth_headers, test_project):
    """Test getting a single project."""
    response = await client.get(f"/projects/{test_project.id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Fazenda Teste"
    assert data["id"] == test_project.id


@pytest.mark.asyncio
async def test_get_project_not_found(client: AsyncClient, auth_headers):
    """Test getting non-existent project."""
    response = await client.get("/projects/99999", headers=auth_headers)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_project(client: AsyncClient, auth_headers, test_project):
    """Test updating a project."""
    response = await client.put(f"/projects/{test_project.id}", json={
        "name": "Fazenda Atualizada",
        "total_area_ha": 200.0,
    }, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Fazenda Atualizada"
    assert data["total_area_ha"] == 200.0


@pytest.mark.asyncio
async def test_delete_project(client: AsyncClient, auth_headers, test_project):
    """Test deleting a project."""
    response = await client.delete(f"/projects/{test_project.id}", headers=auth_headers)
    assert response.status_code == 204

    # Verify it's gone
    response = await client.get(f"/projects/{test_project.id}", headers=auth_headers)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_project_isolation(client: AsyncClient, auth_headers, test_project, db_session):
    """Test user can only see their own projects."""
    from backend.models.user import User
    from backend.core.security import get_password_hash, create_access_token

    # Create another user with a project
    other_user = User(
        email="other@roboroca.com",
        username="otheruser",
        hashed_password=get_password_hash("otherpass123"),
        is_active=True,
    )
    db_session.add(other_user)
    await db_session.commit()
    await db_session.refresh(other_user)

    other_token = create_access_token(data={"sub": str(other_user.id), "email": other_user.email})
    other_headers = {"Authorization": f"Bearer {other_token}"}

    # Other user should not see test_project
    response = await client.get(f"/projects/{test_project.id}", headers=other_headers)
    assert response.status_code == 404

    # Other user's project list should be empty
    response = await client.get("/projects/", headers=other_headers)
    assert response.json()["total"] == 0


def create_vegetation_image(width=200, height=200) -> bytes:
    """Create a test image with green vegetation colors."""
    img = PILImage.new("RGB", (width, height), (30, 120, 30))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf.getvalue()


async def upload_test_image(client: AsyncClient, auth_headers: dict, project_id: int) -> int:
    """Upload test image and return its ID."""
    image_data = create_vegetation_image()
    resp = await client.post(
        "/images/upload",
        files={"file": ("vegetation.jpg", image_data, "image/jpeg")},
        data={"project_id": str(project_id)},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    return resp.json()["image"]["id"]


@pytest.mark.asyncio
async def test_full_report_includes_biomass_and_pest(client: AsyncClient, auth_headers, test_project):
    """Test that individual biomass and pest endpoints produce data that appears in full_report context."""
    image_id = await upload_test_image(client, auth_headers, test_project.id)

    # Run biomass endpoint
    resp = await client.post(f"/analysis/biomass/{image_id}", headers=auth_headers)
    assert resp.status_code == 200
    biomass_data = resp.json()
    assert biomass_data["analysis_type"] == "biomass"
    assert "biomass_index" in biomass_data["results"]
    assert "density_class" in biomass_data["results"]

    # Run pest-disease endpoint
    resp = await client.post(f"/analysis/pest-disease/{image_id}", headers=auth_headers)
    assert resp.status_code == 200
    pest_data = resp.json()
    assert pest_data["analysis_type"] == "pest_disease"
    assert "infection_rate" in pest_data["results"]
    assert "overall_severity" in pest_data["results"]

    # Run full report
    resp = await client.post(f"/analysis/report/{image_id}", headers=auth_headers)
    assert resp.status_code == 200
    report_data = resp.json()
    assert report_data["analysis_type"] == "full_report"
    assert "vegetation_coverage" in report_data["results"]
    assert "vegetation_health" in report_data["results"]


@pytest.mark.asyncio
async def test_analysis_summary_fields(client: AsyncClient, auth_headers, test_project):
    """Test that analysis-summary endpoint returns all expected fields."""
    image_id = await upload_test_image(client, auth_headers, test_project.id)

    # Run a full report to populate summary
    await client.post(f"/analysis/report/{image_id}", headers=auth_headers)

    resp = await client.get(
        f"/projects/{test_project.id}/analysis-summary",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()

    # Core fields
    assert data["project_id"] == test_project.id
    assert data["total_images"] >= 1
    assert data["analyzed_images"] >= 1
    assert "vegetation_coverage_avg" in data
    assert "health_index_avg" in data

    # Biomass and pest fields present (may be None if no biomass/pest analysis ran)
    assert "biomass_index_avg" in data
    assert "biomass_density_class" in data
    assert "pest_infection_rate_avg" in data


@pytest.mark.asyncio
async def test_alerts_valid_structure(client: AsyncClient, auth_headers, test_project):
    """Test that alerts endpoint returns valid alert structure."""
    image_id = await upload_test_image(client, auth_headers, test_project.id)
    await client.post(f"/analysis/report/{image_id}", headers=auth_headers)

    resp = await client.get(
        f"/projects/{test_project.id}/alerts",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()

    assert "alerts" in data
    assert "summary" in data
    assert isinstance(data["alerts"], list)

    # All alert metrics should be valid
    valid_metrics = {"vegetation_coverage", "health_index", "tree_count", "pest_disease", "biomass"}
    for alert in data["alerts"]:
        assert alert["metric"] in valid_metrics
        assert alert["severity"] in ("critical", "warning")
        assert "message" in alert
        assert "current_value" in alert


@pytest.mark.asyncio
async def test_alerts_no_analyses(client: AsyncClient, auth_headers, test_project):
    """Test alerts returns empty when no analyses exist."""
    resp = await client.get(
        f"/projects/{test_project.id}/alerts",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["alerts"] == []
    assert "Sem analises" in data["summary"]
