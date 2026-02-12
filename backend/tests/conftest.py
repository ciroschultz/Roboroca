"""
Test configuration and fixtures.
Uses SQLite in-memory database for fast isolated tests.
"""

import asyncio
import os
import tempfile
from typing import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from backend.core.database import Base, get_db
from backend.core.security import get_password_hash, create_access_token
from backend.main import app
from backend.models.user import User
from backend.models.project import Project
from backend.models.image import Image
from backend.models.analysis import Analysis
from backend.models.annotation import Annotation


# Test database - SQLite in-memory
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
test_session_maker = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    """Create tables before each test and drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Get a test database session."""
    async with test_session_maker() as session:
        yield session


async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    """Override get_db dependency for tests."""
    async with test_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# Override the database dependency
app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """HTTP client for testing."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test/api/v1") as ac:
        yield ac


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create a test user."""
    user = User(
        email="test@roboroca.com",
        username="testuser",
        hashed_password=get_password_hash("testpass123"),
        full_name="Test User",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def auth_token(test_user: User) -> str:
    """Create a valid JWT token for test_user."""
    return create_access_token(
        data={"sub": str(test_user.id), "email": test_user.email}
    )


@pytest_asyncio.fixture
async def auth_headers(auth_token: str) -> dict:
    """Headers with Bearer token for authenticated requests."""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest_asyncio.fixture
async def test_project(db_session: AsyncSession, test_user: User) -> Project:
    """Create a test project."""
    project = Project(
        name="Fazenda Teste",
        description="Projeto de teste",
        status="pending",
        owner_id=test_user.id,
        latitude=-23.5505,
        longitude=-46.6333,
        total_area_ha=100.0,
    )
    db_session.add(project)
    await db_session.commit()
    await db_session.refresh(project)
    return project


@pytest_asyncio.fixture
def upload_dir() -> Generator[str, None, None]:
    """Temporary upload directory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        original = os.environ.get("UPLOAD_DIR")
        os.environ["UPLOAD_DIR"] = tmpdir
        yield tmpdir
        if original:
            os.environ["UPLOAD_DIR"] = original
        else:
            os.environ.pop("UPLOAD_DIR", None)
