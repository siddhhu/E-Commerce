import asyncio
import os
import sys
from sqlalchemy import text
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(env_path)

from app.database import async_session_maker

async def fix():
    async with async_session_maker() as session:
        print("🔧 Updating Product.image_url from first ProductImage...")
        # Update products.image_url with the first image_url from product_images table
        await session.execute(text("""
            UPDATE products 
            SET image_url = (
                SELECT image_url FROM product_images 
                WHERE product_images.product_id = products.id 
                ORDER BY sort_order ASC 
                LIMIT 1
            )
            WHERE image_url IS NULL
        """))
        await session.commit()
        print("✅ Done.")

if __name__ == "__main__":
    asyncio.run(fix())
