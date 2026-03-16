"""
Checkout Router - Checkout endpoints
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends
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


@router.post("", response_model=OrderRead, status_code=201)
async def checkout(
    data: CheckoutRequest,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Create order from cart.
    Validates stock, creates order, sends notifications.
    """
    order_service = OrderService(session)
    
    order = await order_service.create_order_from_cart(
        user_id=current_user.id,
        shipping_address_id=data.shipping_address_id,
        payment_method=data.payment_method,
        notes=data.notes
    )
    
    return order
