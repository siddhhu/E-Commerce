"""
Banners Router - Public banner endpoints
"""


from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import response_cache
from app.database import get_session
from app.models.banner import BannerRead
from app.services.banner_service import BannerService

router = APIRouter()


@router.get("", response_model=list[BannerRead])
async def list_active_banners(
    session: AsyncSession = Depends(get_session)
):
    """
    List active banners for the homepage.
    Public endpoint.
    """
    cache_key = ("banners_active",)
    cached = response_cache.get(cache_key)
    if cached is not None:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            content=cached,
            headers={"Cache-Control": "public, max-age=300, stale-while-revalidate=60"},
        )

    banner_service = BannerService(session)
    banners = await banner_service.list_banners(is_active=True)
    items = [BannerRead.model_validate(b).model_dump(mode="json") for b in banners]
    response_cache.set(cache_key, items, ttl_seconds=300)
    
    from fastapi.responses import JSONResponse
    return JSONResponse(
        content=items,
        headers={"Cache-Control": "public, max-age=300, stale-while-revalidate=60"},
    )
