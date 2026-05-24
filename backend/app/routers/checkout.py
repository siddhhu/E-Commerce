"""
Checkout Router - Two-phase checkout for online payments

ARCHITECTURE:
- COD:    POST /checkout/complete  (one-shot: save address + sync cart + create order)
- ONLINE: POST /checkout/prepare   (validate cart + create Razorpay order — NO DB order)
          → Razorpay popup → user pays
          POST /checkout/complete  (verify signature → save address + sync cart + create order with payment_status=PAID)

This ensures for online payments the DB order is ONLY created after confirmed payment.
No dangling PENDING orders, no stock loss on cancellation.
"""
from decimal import Decimal
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
from app.services.payment_service import PaymentService

router = APIRouter()


# ── Shared input models ──────────────────────────────────────────────────────

class CartItemInput(BaseModel):
    """Cart item sent from frontend store."""
    product_id: UUID
    quantity: int


class AddressInput(BaseModel):
    """Shipping address fields."""
    full_name: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str = "India"


# ── Phase 1 (online only): Prepare — validate cart + create Razorpay order ──

class PrepareCheckoutRequest(BaseModel):
    """
    Lightweight pre-flight for online payment.
    Validates cart items and creates a Razorpay order.
    NO DB order is created here — that happens only after payment confirmation.
    """
    cart_items: List[CartItemInput]
    promo_code: Optional[str] = None


class PrepareCheckoutResponse(BaseModel):
    """Response for /checkout/prepare."""
    razorpay_order_id: str
    amount_paise: int          # Amount in paise (₹ × 100)
    amount_display: float      # Amount in ₹ for display


@router.post("/prepare", response_model=PrepareCheckoutResponse, status_code=200)
async def prepare_checkout(
    data: PrepareCheckoutRequest,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    """
    ONLINE PAYMENT PHASE 1: Validate cart + compute total + create Razorpay order.

    Does NOT create any DB order or decrement stock.
    Returns razorpay_order_id to pass to the Razorpay SDK.
    """
    from app.core.exceptions import ForbiddenException, BadRequestException
    from app.models.user import UserRole
    from app.models.product import Product

    # Guard: no admin/seller orders
    is_admin = current_user.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]
    is_seller = current_user.seller_status == "approved" and current_user.user_type == "seller"
    if is_admin or is_seller:
        raise ForbiddenException("Admin and seller accounts cannot place orders.")

    if not data.cart_items:
        raise BadRequestException("Cart is empty")

    # Batch-validate all products in one query
    product_ids = [item.product_id for item in data.cart_items]
    products_result = await session.execute(
        select(Product).where(Product.id.in_(product_ids), Product.is_active == True)
    )
    products_map = {p.id: p for p in products_result.scalars().all()}

    subtotal = Decimal("0")
    for item in data.cart_items:
        product = products_map.get(item.product_id)
        if not product:
            raise BadRequestException(f"Product not found or unavailable: {item.product_id}")
        if item.quantity > product.stock_quantity:
            raise BadRequestException(f"Insufficient stock for: {product.name}")
        subtotal += product.selling_price * item.quantity

    # Apply promo if provided
    discount = Decimal("0")
    if data.promo_code:
        from app.services.promo_code_service import PromoCodeService
        promo_service = PromoCodeService(session)
        try:
            promo = await promo_service.validate_for_subtotal(data.promo_code, subtotal)
            discount = promo_service.compute_discount(promo, subtotal)
        except Exception:
            pass  # Invalid promo ignored at prepare stage

    total_amount = max(Decimal("0"), subtotal - discount)
    amount_paise = int(total_amount * 100)

    if amount_paise <= 0:
        raise BadRequestException("Order total must be greater than zero for online payment")

    # Create Razorpay order (only this — NO DB order)
    payment_service = PaymentService()
    try:
        import secrets
        receipt = f"prep_{secrets.token_hex(6)}"
        rzp_order = await payment_service.create_order(amount=amount_paise, receipt=receipt)
    except Exception as e:
        raise BadRequestException(f"Failed to initiate payment gateway: {str(e)}")

    return PrepareCheckoutResponse(
        razorpay_order_id=rzp_order["id"],
        amount_paise=amount_paise,
        amount_display=float(total_amount),
    )


# ── Phase 2 / COD: Complete — create DB order ────────────────────────────────

class CompleteCheckoutRequest(BaseModel):
    """
    Combined checkout request — address + cart + payment in one shot.

    For COD:    call directly, no Razorpay fields needed.
    For ONLINE: call ONLY after Razorpay payment.succeeded — pass Razorpay
                payment details for server-side signature verification BEFORE
                the DB order is created. This guarantees the order only exists
                after confirmed payment (no dangling PENDING orders).
    """
    # ── Address ──────────────────────────────────────────────────────────────
    full_name: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str = "India"

    # ── Cart (frontend Zustand store is source of truth) ─────────────────────
    cart_items: List[CartItemInput]

    # ── Order ─────────────────────────────────────────────────────────────────
    payment_method: str   # "cod" or "online"
    notes: Optional[str] = None
    promo_code: Optional[str] = None

    # ── Razorpay fields — REQUIRED for payment_method="online" ───────────────
    razorpay_payment_id: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    razorpay_signature: Optional[str] = None


@router.post("/complete", response_model=OrderRead, status_code=201)
async def complete_checkout(
    data: CompleteCheckoutRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    """
    CHECKOUT COMPLETE: address save + cart sync + order creation in one DB session.

    For COD:    creates order directly with payment_status=PENDING.
    For ONLINE: verifies Razorpay signature FIRST — only creates the DB order
                after successful verification, with payment_status=PAID.
                If signature is invalid → 400 error, no order created, no stock touched.

    Admin and seller accounts cannot place orders.
    """
    from app.core.exceptions import ForbiddenException, BadRequestException
    from app.models.user import UserRole
    from app.models.address import Address
    from app.models.cart import CartItem
    from app.models.product import Product
    from app.models.order import PaymentStatus

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

    # ── ONLINE: verify Razorpay signature BEFORE touching the DB ─────────────
    # This is the key security + correctness gate:
    # - If payment failed/was cancelled → signature missing → 400 → no order created
    # - If signature forged → verification fails → 400 → no order created
    # - Only genuine successful payments pass this gate
    if data.payment_method == "online":
        if not all([data.razorpay_payment_id, data.razorpay_order_id, data.razorpay_signature]):
            raise BadRequestException(
                "Razorpay payment details (payment_id, order_id, signature) are required for online payment. "
                "Complete payment via Razorpay first, then call this endpoint."
            )
        payment_service = PaymentService()
        is_valid = payment_service.verify_payment_signature(
            data.razorpay_order_id,
            data.razorpay_payment_id,
            data.razorpay_signature,
        )
        if not is_valid:
            raise BadRequestException("Payment verification failed. Invalid signature.")

    # ── Step 1: Save address ───────────────────────────────────────────────────
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
    await session.flush()  # get address.id

    # ── Step 2: Sync cart (clear + re-add from frontend store) ────────────────
    await session.execute(sql_delete(CartItem).where(CartItem.user_id == current_user.id))

    # Batch-validate products
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

    await session.flush()  # persist cart items

    # ── Step 3: Create the order ───────────────────────────────────────────────
    # For online payments: Razorpay already verified above.
    # Pass verified Razorpay details so order_service can set payment_status=PAID directly.
    order_service = OrderService(session)
    order = await order_service.create_order_from_cart(
        user_id=current_user.id,
        shipping_address_id=address.id,
        payment_method=data.payment_method,
        notes=data.notes,
        promo_code=data.promo_code,
        background_tasks=background_tasks,
        # Pre-verified Razorpay details (only for online — already validated above)
        razorpay_payment_id=data.razorpay_payment_id,
        razorpay_order_id=data.razorpay_order_id,
        razorpay_signature=data.razorpay_signature,
    )

    return order


# ── Legacy endpoint ───────────────────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    """Checkout request schema (legacy — requires pre-existing address)."""
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
    Create order from cart (legacy — uses pre-existing address ID).
    Admin and seller accounts cannot place orders.
    """
    from app.core.exceptions import ForbiddenException
    from app.models.user import UserRole

    is_admin = current_user.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]
    is_seller = current_user.seller_status == "approved" and current_user.user_type == "seller"
    if is_admin or is_seller:
        raise ForbiddenException(
            "Admin and seller accounts cannot place orders. "
            "Please use a separate customer account to make purchases."
        )

    order_service = OrderService(session)
    return await order_service.create_order_from_cart(
        user_id=current_user.id,
        shipping_address_id=data.shipping_address_id,
        payment_method=data.payment_method,
        notes=data.notes,
        promo_code=data.promo_code,
        background_tasks=background_tasks,
    )
