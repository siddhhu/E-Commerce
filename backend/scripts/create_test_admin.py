import asyncio
import sys
from datetime import timedelta
from sqlalchemy import select
from app.database import init_db, get_session, async_session
from app.models.user import User, UserRole, UserType
from app.core.security import create_access_token
from app.config import settings

async def create_admin():
    async with async_session() as session:
        email = "admin@pranjay.com"
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if not user:
            user = User(
                email=email,
                full_name="Pranjay Admin",
                role=UserRole.ADMIN,
                user_type=UserType.B2B
            )
            session.add(user)
            await session.commit()
            print("Admin user created.")
        else:
            user.role = UserRole.ADMIN
            session.add(user)
            await session.commit()
            print("Existing user updated to Admin.")
            
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": str(user.id), "role": user.role.value if hasattr(user.role, 'value') else user.role},
            expires_delta=access_token_expires,
        )
        print("---TOKEN---")
        print(access_token)
        print("---TOKEN---")

if __name__ == "__main__":
    asyncio.run(create_admin())
