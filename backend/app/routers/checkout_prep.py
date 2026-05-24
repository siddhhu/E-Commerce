"""
Checkout Prep Router
Returns addresses + cart in a single combined response to reduce page-load latency.
"""
import asyncio
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from pydantic import BaseModel
from typing import Any

from app.core.dependencies import get_current_active_user
from app.database import get_session
from app.models.user import User
from app.models.address import Address, AddressRead
from app.models.cart import CartItem
from app.models.product import Product
from app.services.cart_service import CartService

router = APIRouter()


class CheckoutPrepResponse(BaseModel):
    """Combined response: addresses + cart items in a single round-trip."""
    addresses: list[AddressRead]
    cart: Any  # CartResponse shape


@router.get("/checkout-prep")
async def checkout_prep(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Fetch addresses AND cart simultaneously.
    Replaces 2 sequential frontend calls with 1, saving ~400-900ms on Vercel cold paths.
    """
    # Fire both queries in parallel
    addr_query = session.execute(
        select(Address).where(Address.user_id == current_user.id)
    )
    cart_service = CartService(session)
    # CartService.get_cart_total already batches items + products in one call
    cart_coro = cart_service.get_cart_total(current_user.id)

    addr_result, cart_data = await asyncio.gather(addr_query, cart_coro)
    addresses = addr_result.scalars().all()

    return {
        "addresses": [AddressRead.model_validate(a) for a in addresses],
        "cart": cart_data,
    }
