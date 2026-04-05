"""Promo Code Service"""

from datetime import datetime
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.promo_code import PromoCode, PromoCodeCreate, PromoCodeUpdate, PromoDiscountType


class PromoCodeService:
    """Service for promo code operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    @staticmethod
    def normalize_code(code: str) -> str:
        return (code or "").strip().upper()

    async def list_promo_codes(self, skip: int = 0, limit: int = 50) -> list[PromoCode]:
        result = await self.session.execute(
            select(PromoCode).order_by(PromoCode.created_at.desc()).offset(skip).limit(limit)
        )
        return result.scalars().all()

    async def get_by_code(self, code: str) -> PromoCode:
        normalized = self.normalize_code(code)
        result = await self.session.execute(select(PromoCode).where(PromoCode.code == normalized))
        promo = result.scalar_one_or_none()
        if not promo:
            raise NotFoundException("Promo code")
        return promo

    def compute_discount(self, promo: PromoCode, subtotal: Decimal) -> Decimal:
        """Compute discount amount for a subtotal (GST-inclusive subtotal)."""
        if subtotal <= 0:
            return Decimal("0")

        if promo.discount_type == PromoDiscountType.flat:
            discount = promo.discount_value
        else:
            discount = (subtotal * promo.discount_value) / Decimal("100")
            if promo.max_discount_amount is not None:
                discount = min(discount, promo.max_discount_amount)

        # Never exceed subtotal
        if discount < 0:
            discount = Decimal("0")
        if discount > subtotal:
            discount = subtotal
        return discount

    async def create(self, data: PromoCodeCreate) -> PromoCode:
        normalized = self.normalize_code(data.code)
        # Uniqueness is also enforced in DB
        existing = await self.session.execute(select(PromoCode).where(PromoCode.code == normalized))
        if existing.scalar_one_or_none():
            raise BadRequestException("Promo code already exists")

        promo = PromoCode(
            code=normalized,
            discount_type=data.discount_type,
            discount_value=data.discount_value,
            max_discount_amount=data.max_discount_amount,
            is_active=data.is_active,
            max_uses=data.max_uses,
            expires_at=data.expires_at,
        )
        self.session.add(promo)
        await self.session.commit()
        await self.session.refresh(promo)
        return promo

    async def update(self, promo: PromoCode, data: PromoCodeUpdate) -> PromoCode:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(promo, field, value)
        promo.updated_at = datetime.utcnow()
        self.session.add(promo)
        await self.session.commit()
        await self.session.refresh(promo)
        return promo

    async def validate_for_subtotal(self, code: str, subtotal: Decimal) -> PromoCode:
        promo = await self.get_by_code(code)

        if not promo.is_active:
            raise BadRequestException("Promo code is inactive")

        if promo.expires_at and promo.expires_at < datetime.utcnow():
            raise BadRequestException("Promo code has expired")

        if promo.max_uses is not None and promo.used_count >= promo.max_uses:
            raise BadRequestException("Promo code usage limit reached")

        if promo.discount_value <= 0:
            raise BadRequestException("Invalid promo code")

        if promo.discount_type == PromoDiscountType.percent:
            if promo.discount_value > 100:
                raise BadRequestException("Invalid promo code")
            if promo.max_discount_amount is not None and promo.max_discount_amount < 0:
                raise BadRequestException("Invalid promo code")

        if subtotal <= 0:
            raise BadRequestException("Cart subtotal is invalid")

        return promo

    async def mark_used(self, promo: PromoCode) -> None:
        promo.used_count += 1
        promo.updated_at = datetime.utcnow()
        self.session.add(promo)
        await self.session.commit()
