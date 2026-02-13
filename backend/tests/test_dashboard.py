"""
Dashboard and timeline tests - /stats, /comparison, /timeline endpoints.
"""

import pytest
from datetime import datetime, timezone
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.user import User
from backend.models.project import Project
from backend.models.image import Image
from backend.models.analysis import Analysis
from backend.core.security import get_password_hash, create_access_token


# ============================================
# Fixtures
# ============================================

@pytest.fixture
async def second_user(db_session: AsyncSession) -> User:
    """Create a second user for isolation tests."""
    user = User(
        email="other@roboroca.com",
        username="otheruser",
        hashed_password=get_password_hash("otherpass123"),
        full_name="Other User",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def second_user_headers(second_user: User) -> dict:
    """Auth headers for second user."""
    token = create_access_token(
        data={"sub": str(second_user.id), "email": second_user.email}
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def project_with_analysis(
    db_session: AsyncSession, test_user: User, test_project: Project
) -> tuple[Project, Analysis]:
    """Create a project with an image and completed analysis."""
    image = Image(
        filename="test.jpg",
        original_filename="test.jpg",
        file_path="/tmp/test.jpg",
        file_size=1024,
        mime_type="image/jpeg",
        image_type="drone",
        width=1920,
        height=1080,
        status="analyzed",
        project_id=test_project.id,
    )
    db_session.add(image)
    await db_session.commit()
    await db_session.refresh(image)

    analysis = Analysis(
        analysis_type="full_report",
        status="completed",
        image_id=image.id,
        results={
            "vegetation_coverage": {"vegetation_percentage": 75.5},
            "vegetation_health": {"health_index": 0.82},
            "tree_count": {"total_trees": 42},
        },
        completed_at=datetime.now(timezone.utc),
    )
    db_session.add(analysis)
    await db_session.commit()
    await db_session.refresh(analysis)

    return test_project, analysis


# ============================================
# GET /projects/stats
# ============================================

@pytest.mark.asyncio
async def test_stats_empty(client: AsyncClient, auth_headers: dict, test_user: User):
    """Stats endpoint with no projects returns zeros."""
    response = await client.get("/projects/stats", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_projects"] == 0
    assert data["total_images"] == 0
    assert data["total_analyses"] == 0


@pytest.mark.asyncio
async def test_stats_with_data(
    client: AsyncClient, auth_headers: dict, project_with_analysis
):
    """Stats endpoint returns correct counts with data."""
    response = await client.get("/projects/stats", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_projects"] == 1
    assert data["total_images"] == 1
    assert data["total_analyses"] == 1


@pytest.mark.asyncio
async def test_stats_user_isolation(
    client: AsyncClient,
    auth_headers: dict,
    second_user_headers: dict,
    project_with_analysis,
):
    """Stats are isolated per user - second user sees nothing."""
    response = await client.get("/projects/stats", headers=second_user_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_projects"] == 0
    assert data["total_images"] == 0


# ============================================
# GET /projects/comparison
# ============================================

@pytest.mark.asyncio
async def test_comparison_empty(client: AsyncClient, auth_headers: dict, test_user: User):
    """Comparison endpoint with no projects returns empty list."""
    response = await client.get("/projects/comparison", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["projects"] == []


@pytest.mark.asyncio
async def test_comparison_with_data(
    client: AsyncClient, auth_headers: dict, project_with_analysis
):
    """Comparison endpoint returns project with metrics."""
    response = await client.get("/projects/comparison", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["projects"]) == 1
    proj = data["projects"][0]
    assert proj["vegetation_coverage_avg"] == 75.5
    assert proj["health_index_avg"] == 0.82
    assert proj["total_trees"] == 42


@pytest.mark.asyncio
async def test_comparison_user_isolation(
    client: AsyncClient,
    second_user_headers: dict,
    project_with_analysis,
):
    """Comparison is isolated per user."""
    response = await client.get("/projects/comparison", headers=second_user_headers)
    assert response.status_code == 200
    assert response.json()["projects"] == []


# ============================================
# GET /projects/{id}/timeline
# ============================================

@pytest.mark.asyncio
async def test_timeline_empty(
    client: AsyncClient, auth_headers: dict, test_project: Project
):
    """Timeline endpoint with no analyses returns empty list."""
    response = await client.get(
        f"/projects/{test_project.id}/timeline", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["timeline"] == []
    assert data["project_id"] == test_project.id


@pytest.mark.asyncio
async def test_timeline_with_data(
    client: AsyncClient, auth_headers: dict, project_with_analysis
):
    """Timeline endpoint returns aggregated data."""
    project, _ = project_with_analysis
    response = await client.get(
        f"/projects/{project.id}/timeline", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["timeline"]) >= 1
    entry = data["timeline"][0]
    assert "periodo" in entry
    assert "cobertura" in entry
    assert entry["cobertura"] == 75.5


@pytest.mark.asyncio
async def test_timeline_auth_required(client: AsyncClient, test_project: Project):
    """Timeline endpoint requires authentication."""
    response = await client.get(f"/projects/{test_project.id}/timeline")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_timeline_not_found(client: AsyncClient, auth_headers: dict):
    """Timeline for nonexistent project returns 404."""
    response = await client.get("/projects/99999/timeline", headers=auth_headers)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_timeline_user_isolation(
    client: AsyncClient,
    second_user_headers: dict,
    project_with_analysis,
):
    """Timeline is isolated per user - other user gets 404."""
    project, _ = project_with_analysis
    response = await client.get(
        f"/projects/{project.id}/timeline", headers=second_user_headers
    )
    assert response.status_code == 404
