import asyncio
from uuid import UUID
from sqlmodel import select
from app.database import async_session_maker
from app.models.product import Product
from app.services.cart_service import CartService

async def run():
    async with async_session_maker() as session:
        # Get an actual valid product to avoid 404
        res = await session.execute(select(Product.id).limit(1))
        product_id = res.scalar_one_or_none()
        
        if not product_id:
            print("No product in DB!")
            return

        print("Testing with valid product ID:", product_id)
        user_id_str = "59733cd6-d100-4e77-80b0-3264b8cd125a"
        
        svc = CartService(session)
        print("Running cart add...")
        try:
            res = await svc.add_to_cart(UUID(user_id_str), product_id, 1)
            await session.commit()
            print("Success:", res)
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run())
