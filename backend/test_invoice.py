import asyncio
from sqlmodel import select
from app.database import async_session_maker
from app.models.order import Order
from app.services.invoice_service import InvoiceService

async def main():
    async with async_session_maker() as session:
        result = await session.execute(select(Order).limit(1))
        order = result.scalar_one_or_none()
        if order:
            print(f"Found order: {order.id}")
            url = await InvoiceService.generate_and_upload_invoice(order.id, session)
            print(f"Invoice URL: {url}")
        else:
            print("No order found")

if __name__ == "__main__":
    asyncio.run(main())
