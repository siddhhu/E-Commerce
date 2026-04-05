"""Promo Code Model"""

import enum
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class PromoDiscountType(str, enum.Enum):
    """Promo discount type."""

    flat = "flat"
    percent = "percent"


class PromoCodeBase(SQLModel):
    """Promo code base fields."""

    code: str = Field(unique=True, index=True, max_length=50)
    discount_type: PromoDiscountType = Field(default=PromoDiscountType.flat)
    # If flat: INR amount. If percent: percentage in range 0..100
    discount_value: Decimal = Field(max_digits=12, decimal_places=2)
    # Cap only applies for percent discounts (common ecommerce behavior)
    max_discount_amount: Decimal = Field(default=Decimal("1000"), max_digits=12, decimal_places=2)
    is_active: bool = Field(default=True)
    max_uses: Optional[int] = Field(default=None)
    used_count: int = Field(default=0)
    expires_at: Optional[datetime] = Field(default=None)


class PromoCode(PromoCodeBase, table=True):
    """Promo code database model."""

    __tablename__ = "promo_codes"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PromoCodeCreate(SQLModel):
    """Schema for creating promo code."""

    code: str
    discount_type: PromoDiscountType = PromoDiscountType.flat
    discount_value: Decimal
    max_discount_amount: Decimal = Decimal("1000")
    is_active: bool = True
    max_uses: Optional[int] = None
    expires_at: Optional[datetime] = None


class PromoCodeUpdate(SQLModel):
    """Schema for updating promo code."""

    discount_type: Optional[PromoDiscountType] = None
    discount_value: Optional[Decimal] = None
    max_discount_amount: Optional[Decimal] = None
    is_active: Optional[bool] = None
    max_uses: Optional[int] = None
    expires_at: Optional[datetime] = None


class PromoCodeRead(PromoCodeBase):
    """Schema for reading promo code."""

    id: UUID
    created_at: datetime
    updated_at: datetime
