import asyncio
from sqlmodel import select
from app.database import async_session_maker
from app.models.cart import CartItem

async def run():
    async with async_session_maker() as session:
        try:
            res = await session.execute(select(CartItem).limit(1))
            print("Success, CartItems:", res.all())
        except Exception as e:
            print("Error connecting to CartItem:", e)

if __name__ == "__main__":
    asyncio.run(run())
