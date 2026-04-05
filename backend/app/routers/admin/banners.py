"""
Admin Banners Router
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.dependencies import get_current_admin
from app.database import get_session
from app.models.banner import BannerCreate, BannerRead, BannerUpdate
from app.models.user import User
from app.services.banner_service import BannerService
from app.services.storage_service import storage_service

router = APIRouter()

MAX_BANNER_BYTES = 10 * 1024 * 1024
ALLOWED_BANNER_TYPES = {"image/jpeg", "image/png", "image/webp"}


class PaginatedBannersAdmin(BaseModel):
    """Paginated banners for admin."""
    items: list[BannerRead]
    total: int
    page: int
    page_size: int


@router.get("", response_model=PaginatedBannersAdmin)
async def list_banners_admin(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """List all banners (admin view)."""
    banner_service = BannerService(session)
    
    skip = (page - 1) * page_size
    
    banners = await banner_service.list_banners(
        skip=skip,
        limit=page_size,
        is_active=is_active
    )
    
    total = await banner_service.count_banners(is_active=is_active)
    
    return PaginatedBannersAdmin(
        items=banners,
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("", response_model=BannerRead, status_code=201)
async def create_banner(
    data: BannerCreate,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """Create a new banner."""
    banner_service = BannerService(session)
    return await banner_service.create_banner(data)


@router.get("/{banner_id}", response_model=BannerRead)
async def get_banner(
    banner_id: UUID,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """Get banner by ID."""
    banner_service = BannerService(session)
    banner = await banner_service.get_banner(banner_id)
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    return banner


@router.patch("/{banner_id}", response_model=BannerRead)
async def update_banner(
    banner_id: UUID,
    data: BannerUpdate,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """Update a banner."""
    banner_service = BannerService(session)
    banner = await banner_service.get_banner(banner_id)
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    return await banner_service.update_banner(banner, data)


@router.delete("/{banner_id}", status_code=204)
async def delete_banner(
    banner_id: UUID,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """Delete a banner."""
    banner_service = BannerService(session)
    banner = await banner_service.get_banner(banner_id)
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    await banner_service.delete_banner(banner)


@router.post("/upload-image", status_code=201)
async def upload_banner_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_admin),
):
    """Upload a banner image to Supabase storage and return the public URL."""
    content_type = (file.content_type or "").lower().strip()
    if content_type not in ALLOWED_BANNER_TYPES:
        raise HTTPException(status_code=400, detail="Invalid banner image type. Use JPG/PNG/WEBP")

    content = await file.read()
    if len(content) > MAX_BANNER_BYTES:
        raise HTTPException(status_code=400, detail="Banner image too large (max 10MB)")

    image_url = await storage_service.upload_file(
        content,
        file.filename,
        content_type=content_type,
        folder="banners",
    )
    if not image_url:
        raise HTTPException(status_code=400, detail="Failed to upload banner image")

    return {"image_url": image_url}
