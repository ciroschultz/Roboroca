"""
Database configuration and session management.
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

from backend.core.config import settings

# Criar engine assíncrono
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,  # Log SQL queries in debug mode
    future=True,
)

# Session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Base para os modelos
Base = declarative_base()


async def get_db() -> AsyncSession:
    """Dependency para obter sessão do banco de dados."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Inicializar banco de dados (criar tabelas)."""
    # Importar todos os modelos para registrá-los no metadata
    from backend.models.user import User
    from backend.models.project import Project
    from backend.models.image import Image
    from backend.models.analysis import Analysis

    async with engine.begin() as conn:
        # Criar todas as tabelas
        await conn.run_sync(Base.metadata.create_all)

    print("Database tables created successfully")


async def close_db():
    """Fechar conexões do banco de dados."""
    await engine.dispose()
