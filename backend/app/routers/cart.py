"""
Cart Router - Shopping cart endpoints
"""
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.dependencies import get_current_active_user
from app.database import get_session
from app.models.cart import CartItemCreate, CartItemRead, CartItemUpdate, CartItemWithProduct
from app.models.user import User
from app.services.cart_service import CartService

router = APIRouter()


class CartResponse(BaseModel):
    """Cart summary response."""
    items: list[CartItemWithProduct]
    items_count: int
    subtotal: float
    currency: str


@router.get("", response_model=CartResponse)
async def get_cart(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Get current user's cart."""
    cart_service = CartService(session)
    return await cart_service.get_cart_total(current_user.id)


@router.post("/items", response_model=CartItemRead, status_code=201)
async def add_to_cart(
    data: CartItemCreate,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Add item to cart."""
    cart_service = CartService(session)
    return await cart_service.add_to_cart(
        current_user.id,
        data.product_id,
        data.quantity
    )


@router.patch("/items/{item_id}", response_model=CartItemRead)
async def update_cart_item(
    item_id: UUID,
    data: CartItemUpdate,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Update cart item quantity."""
    cart_service = CartService(session)
    return await cart_service.update_cart_item(
        current_user.id,
        item_id,
        data.quantity
    )


@router.delete("/items/{item_id}", status_code=204)
async def remove_from_cart(
    item_id: UUID,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Remove item from cart."""
    cart_service = CartService(session)
    await cart_service.remove_from_cart(current_user.id, item_id)


@router.delete("", status_code=204)
async def clear_cart(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Clear entire cart."""
    cart_service = CartService(session)
    await cart_service.clear_cart(current_user.id)
