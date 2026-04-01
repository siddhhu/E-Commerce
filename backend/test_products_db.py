import asyncio
from sqlmodel import select
from app.database import async_session_maker
from app.models.product import Product

async def run():
    async with async_session_maker() as session:
        # List all products
        res = await session.execute(select(Product.id, Product.name, Product.slug, Product.is_active))
        products = res.all()
        print("=== Products in Supabase DB ===")
        for p in products:
            print(f"  {p[0]}  |  {p[1]}  |  slug={p[2]}  |  active={p[3]}")
        
        # Check specifically for the failing product ID
        target_id = "5ee98080-7686-4e94-9dc6-37cd7bd99cdd"
        found = any(str(p[0]) == target_id for p in products)
        print(f"\nProduct {target_id} EXISTS in DB: {found}")

if __name__ == "__main__":
    asyncio.run(run())
