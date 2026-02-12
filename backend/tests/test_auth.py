"""
Tests for authentication endpoints.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    """Test user registration."""
    response = await client.post("/auth/register", json={
        "email": "new@roboroca.com",
        "username": "newuser",
        "password": "securepass123",
        "full_name": "New User",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "new@roboroca.com"
    assert data["username"] == "newuser"
    assert data["full_name"] == "New User"
    assert data["is_active"] is True
    assert "id" in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, test_user):
    """Test registration with duplicate email fails."""
    response = await client.post("/auth/register", json={
        "email": "test@roboroca.com",
        "username": "different",
        "password": "securepass123",
    })
    assert response.status_code == 400
    assert "Email" in response.json()["detail"]


@pytest.mark.asyncio
async def test_register_duplicate_username(client: AsyncClient, test_user):
    """Test registration with duplicate username fails."""
    response = await client.post("/auth/register", json={
        "email": "different@roboroca.com",
        "username": "testuser",
        "password": "securepass123",
    })
    assert response.status_code == 400
    assert "Username" in response.json()["detail"]


@pytest.mark.asyncio
async def test_register_short_password(client: AsyncClient):
    """Test registration with short password fails."""
    response = await client.post("/auth/register", json={
        "email": "new@roboroca.com",
        "username": "newuser",
        "password": "abc",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, test_user):
    """Test login with correct credentials."""
    response = await client.post("/auth/login", data={
        "username": "test@roboroca.com",
        "password": "testpass123",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, test_user):
    """Test login with wrong password fails."""
    response = await client.post("/auth/login", data={
        "username": "test@roboroca.com",
        "password": "wrongpassword",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_wrong_email(client: AsyncClient, test_user):
    """Test login with non-existent email fails."""
    response = await client.post("/auth/login", data={
        "username": "nope@roboroca.com",
        "password": "testpass123",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient, auth_headers, test_user):
    """Test get current user profile."""
    response = await client.get("/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user.email
    assert data["username"] == test_user.username


@pytest.mark.asyncio
async def test_get_me_unauthorized(client: AsyncClient):
    """Test get profile without auth fails."""
    response = await client.get("/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me_invalid_token(client: AsyncClient):
    """Test get profile with invalid token fails."""
    response = await client.get("/auth/me", headers={
        "Authorization": "Bearer invalid_token_here"
    })
    assert response.status_code == 401
