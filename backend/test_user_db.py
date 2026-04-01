import asyncio
from sqlmodel import select
from app.database import async_session_maker
from app.models.user import User

async def run():
    async with async_session_maker() as session:
        res = await session.execute(select(User.id))
        users = res.all()
        print("Users in DB:", users)
        print("Looking for '59733cd6-d100-4e77-80b0-3264b8cd125a':", any(str(u[0]) == "59733cd6-d100-4e77-80b0-3264b8cd125a" for u in users))

if __name__ == "__main__":
    asyncio.run(run())
