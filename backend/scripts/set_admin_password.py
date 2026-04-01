import asyncio
import sys
from sqlalchemy import select
from app.database import async_session
from app.models.user import User
from app.core.security import hash_password

async def set_password():
    async with async_session() as session:
        email = "admin@pranjay.com"
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if user:
            user.hashed_password = hash_password("Pranjay2026")
            user.is_verified = True
            session.add(user)
            await session.commit()
            print("Password updated and user verified successfully for admin@pranjay.com")
        else:
            print("Admin user not found! Please run seed script or test admin script first.")

if __name__ == "__main__":
    asyncio.run(set_password())
