"""
Tests for Etapa 1 security features:
- RateLimiter (rate_limit.py)
- Magic bytes file validation (_validate_file_magic in images.py)
- SECRET_KEY generation (_generate_dev_secret in config.py)
- Database migration safety (init_db in database.py)
"""

import pytest
from unittest.mock import MagicMock
from fastapi import HTTPException

from backend.core.rate_limit import RateLimiter
from backend.api.routes.images import _validate_file_magic
from backend.core.config import _generate_dev_secret


# ============================================================
# Helpers
# ============================================================


def make_request(ip: str = "127.0.0.1", forwarded: str = None) -> MagicMock:
    """Build a minimal mock Request with client.host and optional X-Forwarded-For."""
    request = MagicMock()
    request.client = MagicMock()
    request.client.host = ip
    if forwarded is not None:
        request.headers = {"X-Forwarded-For": forwarded}
    else:
        request.headers = {}
    return request


# ============================================================
# RateLimiter tests
# ============================================================


@pytest.mark.asyncio
async def test_rate_limiter_allows_requests_within_limit():
    """Requests up to max_requests must pass without raising."""
    limiter = RateLimiter(max_requests=3, window_seconds=60)
    request = make_request("10.0.0.1")

    for _ in range(3):
        await limiter.check(request)  # must not raise


@pytest.mark.asyncio
async def test_rate_limiter_blocks_on_exceeded_limit():
    """The (max_requests + 1)-th request within the window must raise 429."""
    limiter = RateLimiter(max_requests=3, window_seconds=60)
    request = make_request("10.0.0.2")

    for _ in range(3):
        await limiter.check(request)

    with pytest.raises(HTTPException) as exc_info:
        await limiter.check(request)

    assert exc_info.value.status_code == 429


@pytest.mark.asyncio
async def test_rate_limiter_429_includes_retry_after():
    """The 429 response must include a Retry-After header."""
    limiter = RateLimiter(max_requests=1, window_seconds=30)
    request = make_request("10.0.0.3")

    await limiter.check(request)  # first request: allowed

    with pytest.raises(HTTPException) as exc_info:
        await limiter.check(request)  # second: blocked

    assert "Retry-After" in exc_info.value.headers
    assert exc_info.value.headers["Retry-After"] == "30"


@pytest.mark.asyncio
async def test_rate_limiter_different_ips_are_independent():
    """Each IP has its own counter — one IP's exhaustion must not affect others."""
    limiter = RateLimiter(max_requests=2, window_seconds=60)
    req_a = make_request("192.168.1.1")
    req_b = make_request("192.168.1.2")

    # Exhaust IP A
    await limiter.check(req_a)
    await limiter.check(req_a)
    with pytest.raises(HTTPException):
        await limiter.check(req_a)

    # IP B should still be allowed
    await limiter.check(req_b)  # must not raise


@pytest.mark.asyncio
async def test_rate_limiter_uses_x_forwarded_for():
    """When X-Forwarded-For is present it is used as the client IP."""
    limiter = RateLimiter(max_requests=1, window_seconds=60)

    # Two requests that carry the same forwarded IP but different socket IPs
    req1 = make_request(ip="1.2.3.4", forwarded="5.6.7.8")
    req2 = make_request(ip="9.9.9.9", forwarded="5.6.7.8")

    await limiter.check(req1)  # allowed — first request for 5.6.7.8

    # Should be blocked because forwarded IP is the same
    with pytest.raises(HTTPException):
        await limiter.check(req2)


@pytest.mark.asyncio
async def test_rate_limiter_no_client_falls_back_to_unknown():
    """If request.client is None the limiter uses 'unknown' as the key."""
    limiter = RateLimiter(max_requests=2, window_seconds=60)
    request = MagicMock()
    request.client = None
    request.headers = {}

    await limiter.check(request)
    limiter.check(request)

    with pytest.raises(HTTPException) as exc_info:
        limiter.check(request)

    assert exc_info.value.status_code == 429


# ============================================================
# _validate_file_magic tests
# ============================================================


def test_magic_bytes_valid_jpeg():
    """Real JPEG magic bytes must pass validation for .jpg and .jpeg."""
    jpeg_bytes = b"\xff\xd8\xff\xe0" + b"\x00" * 20
    assert _validate_file_magic(jpeg_bytes, "photo.jpg") is True
    assert _validate_file_magic(jpeg_bytes, "photo.jpeg") is True


def test_magic_bytes_valid_png():
    """Real PNG magic bytes must pass validation for .png."""
    png_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 20
    assert _validate_file_magic(png_bytes, "image.png") is True


def test_magic_bytes_valid_tiff_little_endian():
    """TIFF little-endian magic bytes must pass for .tif and .tiff."""
    tiff_le = b"II\x2a\x00" + b"\x00" * 20
    assert _validate_file_magic(tiff_le, "scan.tif") is True
    assert _validate_file_magic(tiff_le, "scan.tiff") is True


def test_magic_bytes_valid_tiff_big_endian():
    """TIFF big-endian magic bytes must pass for .tif and .tiff."""
    tiff_be = b"MM\x00\x2a" + b"\x00" * 20
    assert _validate_file_magic(tiff_be, "scan.tif") is True
    assert _validate_file_magic(tiff_be, "scan.tiff") is True


def test_magic_bytes_valid_mp4():
    """MP4 magic bytes (ftyp at offset 4) must pass for .mp4."""
    mp4_bytes = b"\x00\x00\x00\x20" + b"ftyp" + b"isom" + b"\x00" * 16
    assert _validate_file_magic(mp4_bytes, "clip.mp4") is True


def test_magic_bytes_valid_avi():
    """AVI magic bytes (RIFF...AVI ) must pass for .avi."""
    avi_bytes = b"RIFF" + b"\x00\x00\x00\x00" + b"AVI " + b"\x00" * 20
    assert _validate_file_magic(avi_bytes, "clip.avi") is True


def test_magic_bytes_invalid_jpeg_wrong_signature():
    """Bytes that do NOT start with the JPEG marker must fail for .jpg."""
    bad_bytes = b"\x00\x00\x00\x00" + b"\x00" * 20
    assert _validate_file_magic(bad_bytes, "evil.jpg") is False


def test_magic_bytes_invalid_png_wrong_signature():
    """Bytes that do NOT match the PNG header must fail for .png."""
    bad_bytes = b"\xff\xd8\xff\xe0" + b"\x00" * 20  # JPEG bytes, not PNG
    assert _validate_file_magic(bad_bytes, "evil.png") is False


def test_magic_bytes_content_too_small():
    """Content shorter than 12 bytes must always fail."""
    assert _validate_file_magic(b"\xff\xd8\xff", "small.jpg") is False
    assert _validate_file_magic(b"\x89PNG", "small.png") is False
    assert _validate_file_magic(b"", "empty.jpg") is False


def test_magic_bytes_unknown_extension_passes():
    """An extension not in the map (e.g. .xyz) must pass (non-blocking)."""
    any_bytes = b"\xde\xad\xbe\xef" + b"\x00" * 20
    assert _validate_file_magic(any_bytes, "file.xyz") is True


def test_magic_bytes_jpeg_disguised_as_png():
    """JPEG bytes presented with a .png extension must fail."""
    jpeg_bytes = b"\xff\xd8\xff\xe0" + b"\x00" * 20
    assert _validate_file_magic(jpeg_bytes, "disguised.png") is False


def test_magic_bytes_png_disguised_as_jpeg():
    """PNG bytes presented with a .jpg extension must fail."""
    png_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 20
    assert _validate_file_magic(png_bytes, "disguised.jpg") is False


# ============================================================
# _generate_dev_secret tests
# ============================================================


def test_generate_dev_secret_is_non_empty():
    """Generated secret must be a non-empty string."""
    secret = _generate_dev_secret()
    assert isinstance(secret, str)
    assert len(secret) > 0


def test_generate_dev_secret_minimum_length():
    """secrets.token_urlsafe(48) produces at least 64 characters."""
    secret = _generate_dev_secret()
    assert len(secret) >= 64


def test_generate_dev_secret_different_each_call():
    """Each call must return a unique value (no reuse)."""
    secrets = {_generate_dev_secret() for _ in range(5)}
    assert len(secrets) == 5, "Expected 5 unique secrets, got duplicates"


def test_generate_dev_secret_url_safe_characters():
    """The generated secret must contain only URL-safe base64 characters."""
    import re
    secret = _generate_dev_secret()
    assert re.fullmatch(r"[A-Za-z0-9_\-]+", secret), (
        f"Secret contains non-URL-safe characters: {secret!r}"
    )


# ============================================================
# Database migration safety tests
# ============================================================


@pytest.mark.asyncio
async def test_init_db_runs_without_error():
    """init_db must complete without raising on a fresh in-memory SQLite DB."""
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from backend.core.database import Base

    test_url = "sqlite+aiosqlite:///:memory:"
    engine = create_async_engine(test_url, echo=False)

    # Patch the module-level engine used by init_db so it targets our test DB
    import backend.core.database as db_module
    original_engine = db_module.engine
    db_module.engine = engine

    try:
        await db_module.init_db()
        # If we reach here without an exception the migration ran cleanly
    finally:
        db_module.engine = original_engine
        await engine.dispose()


@pytest.mark.asyncio
async def test_init_db_creates_images_table():
    """init_db must create the 'images' table (and the source_video_id column)."""
    import sqlalchemy as sa
    from sqlalchemy.ext.asyncio import create_async_engine
    from backend.core.database import Base

    test_url = "sqlite+aiosqlite:///:memory:"
    engine = create_async_engine(test_url, echo=False)

    import backend.core.database as db_module
    original_engine = db_module.engine
    db_module.engine = engine

    try:
        await db_module.init_db()

        async with engine.connect() as conn:
            result = await conn.execute(sa.text("PRAGMA table_info(images)"))
            columns = [row[1] for row in result.fetchall()]

        assert "images" or len(columns) > 0, "images table was not created"
        assert "source_video_id" in columns, (
            "Column source_video_id was not added by migration"
        )
    finally:
        db_module.engine = original_engine
        await engine.dispose()


@pytest.mark.asyncio
async def test_init_db_idempotent():
    """Calling init_db twice on the same database must not raise an error."""
    from sqlalchemy.ext.asyncio import create_async_engine

    test_url = "sqlite+aiosqlite:///:memory:"
    engine = create_async_engine(test_url, echo=False)

    import backend.core.database as db_module
    original_engine = db_module.engine
    db_module.engine = engine

    try:
        await db_module.init_db()
        await db_module.init_db()  # second call — must be idempotent
    finally:
        db_module.engine = original_engine
        await engine.dispose()
