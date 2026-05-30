import asyncio
from sqlalchemy import select, func, case
from app.db.session import async_session
from app.models.product import Product
from app.models.brand import Brand

async def test():
    async with async_session() as session:
        query = (
            select(
                Brand.id,
                Brand.name,
                Brand.slug,
                Brand.logo_url,
                func.max(
                    case(
                        (Product.mrp > 0, (Product.mrp - Product.selling_price) / Product.mrp * 100),
                        else_=0
                    )
                ).label("max_discount"),
            )
            .join(Product, Product.brand_id == Brand.id)
            .where(Product.is_active == True)
            .where(Brand.is_active == True)
            .group_by(Brand.id, Brand.name, Brand.slug, Brand.logo_url)
            .having(func.count(Product.id) > 0)
        )
        result = await session.execute(query)
        rows = result.all()
        print("ROWS:", rows)

asyncio.run(test())
