"""
Tests for project endpoints.
"""

import pytest
from httpx import AsyncClient


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
