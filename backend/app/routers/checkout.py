"""
Checkout Router - Checkout endpoints
"""
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete as sql_delete
from pydantic import BaseModel
from sqlmodel import select

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


class CartItemInput(BaseModel):
    """Cart item sent from frontend store."""
    product_id: UUID
    quantity: int


class CompleteCheckoutRequest(BaseModel):
    """
    Combined checkout request — address + cart + payment in one shot.
    Eliminates 4 round-trips (POST address, DELETE cart, POST items×N, POST checkout)
    and collapses them into a single backend call with ONE Supabase connection.
    """
    # Address fields
    full_name: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str = "India"

    # Cart items from the frontend Zustand store (source of truth)
    cart_items: List[CartItemInput]

    # Order details
    payment_method: str
    notes: Optional[str] = None
    promo_code: Optional[str] = None


@router.post("/complete", response_model=OrderRead, status_code=201)
async def complete_checkout(
    data: CompleteCheckoutRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    """
    ONE-SHOT CHECKOUT: address save + cart sync + order creation in a single request.

    This replaces 4 separate frontend API calls with 1, saving 3× Supabase cold-connect
    penalties on Vercel serverless (~3-5s each). Expected total: 4-7s vs 25-30s before.

    Admin and seller accounts cannot place orders.
    """
    from app.core.exceptions import ForbiddenException, BadRequestException
    from app.models.user import UserRole
    from app.models.address import Address
    from app.models.cart import CartItem
    from app.models.product import Product

    # ── Guard: no admin/seller orders ─────────────────────────────────────────
    is_admin = current_user.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]
    is_seller = current_user.seller_status == "approved" and current_user.user_type == "seller"
    if is_admin or is_seller:
        raise ForbiddenException(
            "Admin and seller accounts cannot place orders. "
            "Please use a separate customer account to make purchases."
        )

    if not data.cart_items:
        raise BadRequestException("Cart is empty")

    # ── Step 1: Save address ───────────────────────────────────────────────────
    # Unset any previous default address first
    prev_defaults = await session.execute(
        select(Address).where(Address.user_id == current_user.id, Address.is_default == True)
    )
    for addr in prev_defaults.scalars():
        addr.is_default = False
        session.add(addr)

    address = Address(
        user_id=current_user.id,
        full_name=data.full_name,
        phone=data.phone,
        address_line1=data.address_line1,
        address_line2=data.address_line2,
        city=data.city,
        state=data.state,
        postal_code=data.postal_code,
        country=data.country,
        is_default=True,
    )
    session.add(address)
    await session.flush()  # get address.id without committing yet

    # ── Step 2: Sync cart (clear + re-add from frontend store) ────────────────
    await session.execute(sql_delete(CartItem).where(CartItem.user_id == current_user.id))

    # Validate products exist and are active (batch fetch)
    product_ids = [item.product_id for item in data.cart_items]
    products_result = await session.execute(
        select(Product).where(Product.id.in_(product_ids), Product.is_active == True)
    )
    products_map = {p.id: p for p in products_result.scalars().all()}

    for item in data.cart_items:
        product = products_map.get(item.product_id)
        if not product:
            raise BadRequestException(f"Product not found or unavailable: {item.product_id}")
        if item.quantity > product.stock_quantity:
            raise BadRequestException(f"Insufficient stock for: {product.name}")
        session.add(CartItem(user_id=current_user.id, product_id=item.product_id, quantity=item.quantity))

    await session.flush()  # persist cart items without committing

    # ── Step 3: Create the order ───────────────────────────────────────────────
    order_service = OrderService(session)
    order = await order_service.create_order_from_cart(
        user_id=current_user.id,
        shipping_address_id=address.id,
        payment_method=data.payment_method,
        notes=data.notes,
        promo_code=data.promo_code,
        background_tasks=background_tasks,
    )

    return order


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

