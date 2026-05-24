import asyncio
from sqlmodel import select
from app.database import async_session_maker
from app.models.order import Order
from app.services.invoice_service import InvoiceService

async def main():
    async with async_session_maker() as session:
        result = await session.execute(select(Order).order_by(Order.created_at.desc()).limit(1))
        order = result.scalar_one_or_none()
        if order:
            print("Forcing invoice generation...")
            order.invoice_url = None # Force generation
            url = await InvoiceService.generate_and_upload_invoice(order.id, session)
            print(f"Result URL: {url}")

if __name__ == "__main__":
    asyncio.run(main())
