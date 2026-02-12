"""
Tests for image upload and management endpoints.
"""

import io
import pytest
from httpx import AsyncClient
from PIL import Image as PILImage


def create_test_image(width=100, height=100, color=(0, 128, 0)) -> bytes:
    """Create a small test JPEG image in memory."""
    img = PILImage.new("RGB", (width, height), color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf.getvalue()


def create_test_png(width=50, height=50) -> bytes:
    """Create a small test PNG image in memory."""
    img = PILImage.new("RGB", (width, height), (0, 255, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.getvalue()


@pytest.mark.asyncio
async def test_upload_image(client: AsyncClient, auth_headers, test_project):
    """Test uploading an image to a project."""
    image_data = create_test_image()
    response = await client.post(
        "/images/upload",
        files={"file": ("test.jpg", image_data, "image/jpeg")},
        data={"project_id": str(test_project.id), "image_type": "drone"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["message"] == "Upload realizado com sucesso"
    assert data["image"]["original_filename"] == "test.jpg"


@pytest.mark.asyncio
async def test_upload_png(client: AsyncClient, auth_headers, test_project):
    """Test uploading a PNG image."""
    png_data = create_test_png()
    response = await client.post(
        "/images/upload",
        files={"file": ("photo.png", png_data, "image/png")},
        data={"project_id": str(test_project.id)},
        headers=auth_headers,
    )
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_upload_invalid_format(client: AsyncClient, auth_headers, test_project):
    """Test uploading unsupported format fails."""
    response = await client.post(
        "/images/upload",
        files={"file": ("doc.pdf", b"fake pdf content", "application/pdf")},
        data={"project_id": str(test_project.id)},
        headers=auth_headers,
    )
    assert response.status_code == 400
    assert "Formato" in response.json()["detail"]


@pytest.mark.asyncio
async def test_upload_to_nonexistent_project(client: AsyncClient, auth_headers):
    """Test uploading to non-existent project fails."""
    image_data = create_test_image()
    response = await client.post(
        "/images/upload",
        files={"file": ("test.jpg", image_data, "image/jpeg")},
        data={"project_id": "99999"},
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_upload_unauthorized(client: AsyncClient, test_project):
    """Test uploading without auth fails."""
    image_data = create_test_image()
    response = await client.post(
        "/images/upload",
        files={"file": ("test.jpg", image_data, "image/jpeg")},
        data={"project_id": str(test_project.id)},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_images(client: AsyncClient, auth_headers, test_project):
    """Test listing images for a project."""
    # Upload an image first
    image_data = create_test_image()
    await client.post(
        "/images/upload",
        files={"file": ("test.jpg", image_data, "image/jpeg")},
        data={"project_id": str(test_project.id)},
        headers=auth_headers,
    )

    # List images
    response = await client.get(
        f"/images/?project_id={test_project.id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert len(data["images"]) >= 1


@pytest.mark.asyncio
async def test_get_image(client: AsyncClient, auth_headers, test_project):
    """Test getting a single image."""
    # Upload first
    image_data = create_test_image()
    upload_resp = await client.post(
        "/images/upload",
        files={"file": ("detail.jpg", image_data, "image/jpeg")},
        data={"project_id": str(test_project.id)},
        headers=auth_headers,
    )
    image_id = upload_resp.json()["image"]["id"]

    # Get image
    response = await client.get(f"/images/{image_id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["original_filename"] == "detail.jpg"


@pytest.mark.asyncio
async def test_delete_image(client: AsyncClient, auth_headers, test_project):
    """Test deleting an image."""
    # Upload first
    image_data = create_test_image()
    upload_resp = await client.post(
        "/images/upload",
        files={"file": ("delete_me.jpg", image_data, "image/jpeg")},
        data={"project_id": str(test_project.id)},
        headers=auth_headers,
    )
    image_id = upload_resp.json()["image"]["id"]

    # Delete
    response = await client.delete(f"/images/{image_id}", headers=auth_headers)
    assert response.status_code == 204

    # Verify it's gone
    response = await client.get(f"/images/{image_id}", headers=auth_headers)
    assert response.status_code == 404
