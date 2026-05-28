"""
Banners Router - Public banner endpoints
"""


from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

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
    banner_service = BannerService(session)
    banners = await banner_service.list_banners(is_active=True)
    items = [BannerRead.model_validate(b).model_dump(mode="json") for b in banners]
    
    from fastapi.responses import JSONResponse
    return JSONResponse(
        content=items,
        headers={"Cache-Control": "public, max-age=300, stale-while-revalidate=60"},
    )
