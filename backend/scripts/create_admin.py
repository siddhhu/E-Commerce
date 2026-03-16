"""
Script to create an initial admin user with a password.
Usage: python -m scripts.create_admin <email> <password>
"""
import asyncio
import sys

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import async_session_maker
from app.models.user import User, UserRole
from app.core.security import hash_password

async def create_admin(email: str, password: str):
    async with async_session_maker() as session:
        # Check if user already exists
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        hashed = hash_password(password)
        
        if user:
            print(f"User {email} already exists. Updating role to ADMIN and setting password.")
            user.role = UserRole.ADMIN
            user.hashed_password = hashed
            session.add(user)
        else:
            print(f"Creating new admin user: {email}")
            user = User(
                email=email,
                role=UserRole.ADMIN,
                is_verified=True,
                hashed_password=hashed
            )
            session.add(user)
            
        await session.commit()
        print(f"Successfully configured admin user: {email}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python -m scripts.create_admin <email> <password>")
        sys.exit(1)
        
    email = sys.argv[1]
    password = sys.argv[2]
    
    asyncio.run(create_admin(email, password))
