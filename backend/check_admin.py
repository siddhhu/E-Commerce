import asyncio
import sys
from pathlib import Path

# Add backend directory to path
sys.path.append(str(Path.cwd()))

from app.database import async_session
from app.models.user import User
from sqlalchemy import select

async def check_admin():
    async with async_session() as session:
        result = await session.execute(select(User).where(User.email == "admin@pranjay.com"))
        user = result.scalar_one_or_none()
        if user:
            print(f"Admin found: {user.email}, role: {user.role}")
        else:
            print("Admin NOT found.")

if __name__ == "__main__":
    asyncio.run(check_admin())
