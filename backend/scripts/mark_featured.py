import asyncio
import os
import sys
from sqlalchemy import text
from dotenv import load_dotenv

# Ensure backend app is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
# Ensure we load the .env from the backend directory BEFORE importing app.database
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(env_path)

from app.database import async_session_maker

async def mark_featured(limit: int = 20):
    """Mark the first N products as featured."""
    
    async with async_session_maker() as session:
        # Check current featured count
        result = await session.execute(text("SELECT count(*) FROM products WHERE is_featured = true"))
        count = result.scalar()
        
        if count > 0:
            print(f"✅ {count} products are already featured.")
            return

        print(f"🔧 Marking up to {limit} products as featured...")
        
        # Update the first N products
        await session.execute(text(f"""
            UPDATE products 
            SET is_featured = true 
            WHERE id IN (
                SELECT id FROM products 
                WHERE is_active = true 
                LIMIT {limit}
            )
        """))
        await session.commit()
        
        # Verify
        result = await session.execute(text("SELECT count(*) FROM products WHERE is_featured = true"))
        new_count = result.scalar()
        print(f"🎉 Success! {new_count} products are now featured.")

if __name__ == "__main__":
    asyncio.run(mark_featured())
