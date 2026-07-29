"""Home page bootstrap — one round-trip for initial shop load."""

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import response_cache
from app.database import get_session
from app.models.category import Category, CategoryRead
from app.services.product_service import ProductService
from app.services.promo_code_service import PromoCodeService
from sqlmodel import select

router = APIRouter()


class HomeBootstrapResponse(BaseModel):
    featured: list
    discounted: list
    categories: list
    promos: list


@router.get("/bootstrap", response_model=HomeBootstrapResponse)
async def home_bootstrap(
    featured_limit: int = Query(20, ge=1, le=50),
    discounted_limit: int = Query(20, ge=1, le=50),
    session: AsyncSession = Depends(get_session),
):
    """
    Single request for homepage: featured, live discounts, categories, active promos.
    Used by web + native app for fast first paint when SSR data is unavailable.
    """
    cache_key = ("home_bootstrap", featured_limit, discounted_limit)
    cached = response_cache.get(cache_key)
    if cached is not None:
        return JSONResponse(
            content=cached,
            headers={"Cache-Control": "public, max-age=60, stale-while-revalidate=30"},
        )

    product_service = ProductService(session)
    promo_service = PromoCodeService(session)

    featured, _ = await product_service.list_product_summaries(
        limit=featured_limit, is_featured=True, is_active=True
    )
    discounted, _ = await product_service.list_product_summaries(
        limit=discounted_limit, is_active=True, is_discounted_featured=True
    )

    cat_result = await session.execute(
        select(Category)
        .where(Category.is_active == True)
        .order_by(Category.sort_order, Category.name)
    )
    categories = [
        CategoryRead.model_validate(c).model_dump(mode="json")
        for c in cat_result.scalars().all()
    ]

    promos = await promo_service.list_active_public(limit=3)
    from app.models.promo_code import PromoCodeRead

    content = HomeBootstrapResponse(
        featured=[i.model_dump(mode="json") for i in featured],
        discounted=[i.model_dump(mode="json") for i in discounted],
        categories=categories,
        promos=[PromoCodeRead.model_validate(p).model_dump(mode="json") for p in promos],
    ).model_dump(mode="json")

    response_cache.set(cache_key, content, ttl_seconds=60)
    return JSONResponse(
        content=content,
        headers={"Cache-Control": "public, max-age=60, stale-while-revalidate=30"},
    )
