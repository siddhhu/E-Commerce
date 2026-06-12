"""Promo Codes Router - validation/apply helpers"""

from decimal import Decimal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_active_user
from app.database import get_session
from app.models.promo_code import PromoCodeRead
from app.models.user import User
from app.services.promo_code_service import PromoCodeService

router = APIRouter()


class PromoValidateRequest(BaseModel):
    code: str
    subtotal: float


class PromoValidateResponse(BaseModel):
    code: str
    discount_amount: float


@router.get("/active", response_model=list[PromoCodeRead])
async def list_active_promo_codes(
    limit: int = 6,
    session: AsyncSession = Depends(get_session),
):
    service = PromoCodeService(session)
    promos = await service.list_active_public(limit=max(1, min(limit, 10)))
    return [PromoCodeRead.model_validate(promo) for promo in promos]


@router.post("/validate", response_model=PromoValidateResponse)
async def validate_promo_code(
    data: PromoValidateRequest,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    service = PromoCodeService(session)
    subtotal = Decimal(str(data.subtotal))
    promo = await service.validate_for_subtotal(data.code, subtotal)
    discount = service.compute_discount(promo, subtotal)
    return PromoValidateResponse(code=promo.code, discount_amount=float(discount))
