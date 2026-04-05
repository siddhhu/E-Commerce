"""Admin Promo Codes Router"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_admin
from app.database import get_session
from app.models.promo_code import PromoCodeCreate, PromoCodeRead, PromoCodeUpdate
from app.models.user import User
from app.services.promo_code_service import PromoCodeService

router = APIRouter()


class PaginatedPromoCodesAdmin(BaseModel):
    items: list[PromoCodeRead]
    total: int
    page: int
    page_size: int


@router.get("", response_model=PaginatedPromoCodesAdmin)
async def list_promo_codes_admin(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
):
    service = PromoCodeService(session)
    skip = (page - 1) * page_size
    items = await service.list_promo_codes(skip=skip, limit=page_size)

    from sqlalchemy import func
    from sqlmodel import select
    from app.models.promo_code import PromoCode

    total_res = await session.execute(select(func.count(PromoCode.id)))
    total = total_res.scalar() or 0

    return PaginatedPromoCodesAdmin(
        items=[PromoCodeRead.model_validate(p) for p in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=PromoCodeRead, status_code=201)
async def create_promo_code_admin(
    data: PromoCodeCreate,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
):
    service = PromoCodeService(session)
    promo = await service.create(data)
    return PromoCodeRead.model_validate(promo)


@router.patch("/{promo_id}", response_model=PromoCodeRead)
async def update_promo_code_admin(
    promo_id: UUID,
    data: PromoCodeUpdate,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
):
    from sqlmodel import select
    from app.models.promo_code import PromoCode

    res = await session.execute(select(PromoCode).where(PromoCode.id == promo_id))
    promo = res.scalar_one_or_none()
    if not promo:
        from app.core.exceptions import NotFoundException

        raise NotFoundException("Promo code")

    service = PromoCodeService(session)
    updated = await service.update(promo, data)
    return PromoCodeRead.model_validate(updated)


@router.delete("/{promo_id}", status_code=204)
async def delete_promo_code_admin(
    promo_id: UUID,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
):
    from sqlmodel import select
    from app.models.promo_code import PromoCode

    res = await session.execute(select(PromoCode).where(PromoCode.id == promo_id))
    promo = res.scalar_one_or_none()
    if not promo:
        from app.core.exceptions import NotFoundException

        raise NotFoundException("Promo code")

    await session.delete(promo)
    await session.commit()
