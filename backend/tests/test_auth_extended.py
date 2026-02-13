"""
Extended auth tests - profile update, preferences, password change, password reset.
"""

import pytest
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.user import User
from backend.core.security import get_password_hash, verify_password


# ============================================
# PUT /auth/me - Profile update
# ============================================

@pytest.mark.asyncio
async def test_update_profile_full_name(client: AsyncClient, auth_headers: dict):
    """Update full_name via PUT /auth/me."""
    response = await client.put(
        "/auth/me",
        json={"full_name": "Updated Name"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Updated Name"


@pytest.mark.asyncio
async def test_update_profile_phone_bio_company(client: AsyncClient, auth_headers: dict):
    """Update phone, bio, company via PUT /auth/me."""
    response = await client.put(
        "/auth/me",
        json={
            "full_name": "Test User",
            "phone": "+55 11 99999-0000",
            "bio": "Agricultor em MG",
            "company": "Fazenda Boa Vista",
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["phone"] == "+55 11 99999-0000"
    assert data["bio"] == "Agricultor em MG"
    assert data["company"] == "Fazenda Boa Vista"


@pytest.mark.asyncio
async def test_update_profile_partial(client: AsyncClient, auth_headers: dict):
    """Partial update only changes specified fields."""
    response = await client.put(
        "/auth/me",
        json={"phone": "123456"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["phone"] == "123456"
    # full_name should remain unchanged
    assert data["full_name"] == "Test User"


@pytest.mark.asyncio
async def test_update_profile_unauthenticated(client: AsyncClient):
    """PUT /auth/me without token returns 401."""
    response = await client.put("/auth/me", json={"full_name": "Hacker"})
    assert response.status_code == 401


# ============================================
# PUT /auth/preferences
# ============================================

@pytest.mark.asyncio
async def test_update_preferences_theme(client: AsyncClient, auth_headers: dict):
    """Update theme preference."""
    response = await client.put(
        "/auth/preferences",
        json={"theme": "light"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["theme"] == "light"


@pytest.mark.asyncio
async def test_update_preferences_notifications(client: AsyncClient, auth_headers: dict):
    """Update notification preferences."""
    response = await client.put(
        "/auth/preferences",
        json={
            "email_notifications": False,
            "push_notifications": False,
            "weekly_report": True,
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email_notifications"] is False
    assert data["push_notifications"] is False
    assert data["weekly_report"] is True


@pytest.mark.asyncio
async def test_update_preferences_language(client: AsyncClient, auth_headers: dict):
    """Update language preference."""
    response = await client.put(
        "/auth/preferences",
        json={"language": "en-US"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["language"] == "en-US"


@pytest.mark.asyncio
async def test_preferences_persist(client: AsyncClient, auth_headers: dict):
    """Preferences persist across GET /auth/me calls."""
    await client.put(
        "/auth/preferences",
        json={"theme": "system", "weekly_report": True},
        headers=auth_headers,
    )
    response = await client.get("/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["theme"] == "system"
    assert data["weekly_report"] is True


# ============================================
# POST /auth/password/change
# ============================================

@pytest.mark.asyncio
async def test_change_password_success(client: AsyncClient, auth_headers: dict):
    """Change password with correct current password."""
    response = await client.post(
        "/auth/password/change",
        json={"current_password": "testpass123", "new_password": "newpass456"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert "sucesso" in response.json()["message"].lower()


@pytest.mark.asyncio
async def test_change_password_wrong_current(client: AsyncClient, auth_headers: dict):
    """Change password with wrong current password returns 400."""
    response = await client.post(
        "/auth/password/change",
        json={"current_password": "wrongpass", "new_password": "newpass456"},
        headers=auth_headers,
    )
    assert response.status_code == 400
    assert "incorreta" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_change_password_short_new(client: AsyncClient, auth_headers: dict):
    """New password too short returns 422."""
    response = await client.post(
        "/auth/password/change",
        json={"current_password": "testpass123", "new_password": "abc"},
        headers=auth_headers,
    )
    assert response.status_code == 422


# ============================================
# POST /auth/password/reset-request + reset-confirm
# ============================================

@pytest.mark.asyncio
async def test_reset_request_existing_email(client: AsyncClient, test_user: User):
    """Reset request with existing email returns success."""
    response = await client.post(
        "/auth/password/reset-request",
        json={"email": test_user.email},
    )
    assert response.status_code == 200
    assert "message" in response.json()


@pytest.mark.asyncio
async def test_reset_request_nonexistent_email(client: AsyncClient):
    """Reset request with unknown email still returns 200 (no enumeration)."""
    response = await client.post(
        "/auth/password/reset-request",
        json={"email": "nobody@example.com"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_reset_confirm_full_flow(
    client: AsyncClient, db_session: AsyncSession, test_user: User
):
    """Full password reset flow: request -> token -> confirm."""
    # Request reset
    await client.post(
        "/auth/password/reset-request",
        json={"email": test_user.email},
    )

    # Fetch token from DB
    await db_session.refresh(test_user)
    assert test_user.reset_token is not None
    token = test_user.reset_token

    # Confirm reset with token
    response = await client.post(
        "/auth/password/reset-confirm",
        json={"token": token, "new_password": "resetted123"},
    )
    assert response.status_code == 200

    # Verify login with new password works
    login_response = await client.post(
        "/auth/login",
        data={"username": test_user.email, "password": "resetted123"},
    )
    assert login_response.status_code == 200
    assert "access_token" in login_response.json()


@pytest.mark.asyncio
async def test_reset_confirm_invalid_token(client: AsyncClient):
    """Reset confirm with invalid token returns 400."""
    response = await client.post(
        "/auth/password/reset-confirm",
        json={"token": "invalidtoken123", "new_password": "newpass456"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_reset_confirm_expired_token(
    client: AsyncClient, db_session: AsyncSession, test_user: User
):
    """Reset confirm with expired token returns 400."""
    # Manually set expired token
    test_user.reset_token = "expiredtoken"
    test_user.reset_token_expires = datetime.now(timezone.utc) - timedelta(hours=2)
    await db_session.commit()

    response = await client.post(
        "/auth/password/reset-confirm",
        json={"token": "expiredtoken", "new_password": "newpass456"},
    )
    assert response.status_code == 400
