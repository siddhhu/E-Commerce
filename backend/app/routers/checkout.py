"""
Checkout Router - Checkout endpoints
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.dependencies import get_current_active_user
from app.database import get_session
from app.models.order import OrderRead
from app.models.user import User
from app.services.order_service import OrderService

router = APIRouter()


class CheckoutRequest(BaseModel):
    """Checkout request schema."""
    shipping_address_id: UUID
    payment_method: str
    notes: Optional[str] = None
    promo_code: Optional[str] = None


@router.post("", response_model=OrderRead, status_code=201)
async def checkout(
    data: CheckoutRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Create order from cart.
    Admin and seller accounts cannot place orders — they must use a customer account.
    """
    from app.core.exceptions import ForbiddenException
    from app.models.user import UserRole

    # Block admin/seller accounts from placing orders
    is_admin = current_user.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]
    is_seller = current_user.seller_status == "approved" and current_user.user_type == "seller"
    if is_admin or is_seller:
        raise ForbiddenException(
            "Admin and seller accounts cannot place orders. "
            "Please use a separate customer account to make purchases."
        )

    order_service = OrderService(session)

    order = await order_service.create_order_from_cart(
        user_id=current_user.id,
        shipping_address_id=data.shipping_address_id,
        payment_method=data.payment_method,
        notes=data.notes,
        promo_code=data.promo_code,
        background_tasks=background_tasks
    )

    return order
