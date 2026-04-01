import asyncio
from uuid import UUID
from app.services.cart_service import CartService
from app.database import async_session_maker

async def run():
    async with async_session_maker() as session:
        user_id_str = "59733cd6-d100-4e77-80b0-3264b8cd125a"
        product_id_str = "5ee98080-7686-4e94-9dc6-37cd7bd99cdd"
        
        svc = CartService(session)
        print("Running cart add...")
        try:
            res = await svc.add_to_cart(UUID(user_id_str), UUID(product_id_str), 1)
            await session.commit()
            print("Success:", res)
        except Exception as e:
            import traceback
            traceback.print_exc()

asyncio.run(run())
