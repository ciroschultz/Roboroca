"""
Database configuration and session management.
"""

import logging

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

from backend.core.config import settings

is_sqlite = settings.DATABASE_URL.startswith("sqlite")

# Criar engine assíncrono
engine_kwargs = {
    "echo": settings.DEBUG,  # Log SQL queries in debug mode
    "future": True,
}
if not is_sqlite:
    engine_kwargs.update({
        "pool_size": 10,
        "max_overflow": 20,
        "pool_pre_ping": True,
    })

engine = create_async_engine(settings.DATABASE_URL, **engine_kwargs)

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
    from backend.models.api_key import ApiKey
    from backend.modules.calculator.models import Calculation
    from backend.modules.equipment.models import Product, CartItem, Favorite, Order, OrderItem, OrderStatusHistory
    from backend.modules.precision.models import Field, FieldSnapshot, ManagementZone, Prescription, ActivityLog
    from backend.modules.spectral.models import SpectralSample, CalibrationPoint, LibrarySpectrum

    async with engine.begin() as conn:
        # Criar todas as tabelas
        await conn.run_sync(Base.metadata.create_all)

        # Migrações manuais — verificar antes de adicionar colunas
        import sqlalchemy as sa

        async def column_exists(conn, table: str, column: str) -> bool:
            if is_sqlite:
                result = await conn.execute(sa.text(f"PRAGMA table_info({table})"))
                columns = [row[1] for row in result.fetchall()]
                return column in columns
            else:
                result = await conn.execute(
                    sa.text(
                        "SELECT column_name FROM information_schema.columns"
                        " WHERE table_name = :table AND column_name = :column"
                    ),
                    {"table": table, "column": column},
                )
                return result.fetchone() is not None

        if not await column_exists(conn, "images", "source_video_id"):
            await conn.execute(
                sa.text("ALTER TABLE images ADD COLUMN source_video_id INTEGER")
            )

    logging.getLogger(__name__).info("Database tables created successfully")

    # Seed equipment products
    try:
        from backend.modules.equipment.seed import seed_products
        async with async_session_maker() as session:
            count = await seed_products(session)
            if count > 0:
                await session.commit()
                logging.getLogger(__name__).info("Seeded %d equipment products", count)
    except Exception as e:
        logging.getLogger(__name__).warning("Failed to seed products: %s", e)


async def close_db():
    """Fechar conexões do banco de dados."""
    await engine.dispose()
