import asyncio
import os
import sys
from sqlalchemy import select

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import async_session_maker
from app.models.product import Product

async def check():
    async with async_session_maker() as session:
        res = await session.execute(select(Product.image_url).limit(5))
        urls = res.scalars().all()
        print(f"Sample URLs in DB:")
        for u in urls:
            print(f"  - {u}")

if __name__ == "__main__":
    asyncio.run(check())
