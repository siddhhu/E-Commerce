import asyncio
import os
import sys
from sqlalchemy import text
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(env_path)

from app.database import async_session_maker

async def clear():
    async with async_session_maker() as session:
        print("🧨 Clearing products, product_images, and categories...")
        # Note: Order matters due to FK constraints
        await session.execute(text("TRUNCATE TABLE wishlist_items CASCADE"))
        await session.execute(text("TRUNCATE TABLE cart_items CASCADE"))
        await session.execute(text("TRUNCATE TABLE product_images CASCADE"))
        await session.execute(text("TRUNCATE TABLE products CASCADE"))
        await session.execute(text("TRUNCATE TABLE categories CASCADE"))
        await session.commit()
        print("✅ Done.")

if __name__ == "__main__":
    asyncio.run(clear())
