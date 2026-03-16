"""
Pranjay Backend - Database Configuration
"""
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

from app.config import settings

# Ensure we use the async driver
db_url = settings.database_url
if db_url:
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)

# Create async engine with robust connection handling
connect_args = {}
if "sqlite" in db_url:
    connect_args = {"check_same_thread": False}
elif "postgresql" in db_url:
    import ssl
    # Managed Postgres often have proxies that kill idle connections or
    # require very specific SSL handshakes.
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    connect_args = {
        "ssl": ssl_context,
        "statement_cache_size": 0,
        "command_timeout": 60,
    }

engine = create_async_engine(
    db_url,
    echo=settings.debug,
    future=True,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    pool_recycle=300,  # Refresh connections every 5 minutes
    connect_args=connect_args
)

# Create async session factory
async_session_maker = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Alias for seed scripts
async_session = async_session_maker


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get database session."""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database tables with retries."""
    import asyncio
    max_retries = 3
    retry_delay = 2
    
    for attempt in range(max_retries):
        print(f"Database: Initializing tables (Attempt {attempt + 1}/{max_retries})...")
        try:
            async with engine.begin() as conn:
                await conn.run_sync(SQLModel.metadata.create_all)
            print("Database: Initialization complete.")
            return
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"Database: Initialization attempt {attempt + 1} failed: {e}. Retrying in {retry_delay}s...")
                await asyncio.sleep(retry_delay)
            else:
                print(f"Database: Initialization failed after {max_retries} attempts: {e}")
                raise e


async def close_db() -> None:
    """Close database connections."""
    await engine.dispose()
