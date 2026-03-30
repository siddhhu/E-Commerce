"""
Quick script to create the banners table directly using SQLModel/SQLite.
Run with: cd backend && source venv/bin/activate && python scripts/create_banners_table.py
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel import SQLModel

# Import all models to ensure they are registered
from app.models.banner import Banner  # noqa

DATABASE_URL = "sqlite+aiosqlite:///./data/pranjay.db"

async def main():
    engine = create_async_engine(DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        # Create only tables that don't exist yet
        await conn.run_sync(
            lambda sync_conn: SQLModel.metadata.create_all(sync_conn, tables=[Banner.__table__], checkfirst=True)
        )
    print("✅ banners table created (or already exists)")
    await engine.dispose()

asyncio.run(main())
