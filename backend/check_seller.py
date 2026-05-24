import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")

async def check():
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        result = await session.execute(text("SELECT email, seller_username, role, seller_status, is_active FROM users WHERE seller_username = 'parlar-house1506@pranjay.com' OR email = 'parlar-house1506@pranjay.com'"))
        users = result.fetchall()
        for user in users:
            print("User:", user)

asyncio.run(check())
