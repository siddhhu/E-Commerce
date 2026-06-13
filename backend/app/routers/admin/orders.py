"""
Admin Orders Router
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.dependencies import get_current_admin
from app.database import get_session
from app.models.order import OrderListRead, OrderRead, OrderStatus, PaymentStatus, build_order_read
from app.models.user import User
from app.services.order_service import OrderService

router = APIRouter()


class PaginatedOrdersAdmin(BaseModel):
    """Paginated orders for admin."""
    items: list[OrderListRead]
    total: int
    page: int
    page_size: int


class UpdateOrderStatus(BaseModel):
    """Update order status request."""
    status: OrderStatus


class UpdatePaymentStatus(BaseModel):
    """Update payment status request."""
    payment_status: PaymentStatus


@router.get("", response_model=PaginatedOrdersAdmin)
async def list_orders_admin(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[OrderStatus] = None,
    payment_status: Optional[PaymentStatus] = None,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """
    List orders.
    - Super admin / Admin: sees ALL orders
    - Approved seller: sees only orders containing their products
    """
    from sqlalchemy import func, distinct
    from sqlmodel import select
    from app.models.order import Order
    from app.models.user import UserRole

    is_admin = current_user.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]
    order_service = OrderService(session)
    skip = (page - 1) * page_size

    if is_admin:
        # Full visibility
        orders = await order_service.list_all_orders(
            skip=skip,
            limit=page_size,
            status=status,
            payment_status=payment_status
        )
        count_query = select(func.count(Order.id))
        if status:
            count_query = count_query.where(Order.status == status)
        if payment_status:
            count_query = count_query.where(Order.payment_status == payment_status)
        result = await session.execute(count_query)
        total = result.scalar() or 0
    else:
        # Seller: only orders that contain at least one of their products
        from app.models.order import OrderItem
        from app.models.product import Product

        seller_order_ids_q = (
            select(distinct(OrderItem.order_id))
            .join(Product, Product.id == OrderItem.product_id)
            .where(Product.seller_id == current_user.id)
        )
        seller_order_ids = (await session.execute(seller_order_ids_q)).scalars().all()

        if not seller_order_ids:
            return PaginatedOrdersAdmin(items=[], total=0, page=page, page_size=page_size)

        from sqlalchemy import and_
        from sqlalchemy.orm import selectinload as sil

        order_q = (
            select(Order)
            .options(sil(Order.items), sil(Order.user))
            .where(Order.id.in_(seller_order_ids))
        )
        if status:
            order_q = order_q.where(Order.status == status)
        if payment_status:
            order_q = order_q.where(Order.payment_status == payment_status)
        order_q = order_q.order_by(Order.created_at.desc()).offset(skip).limit(page_size)

        orders = (await session.execute(order_q)).scalars().all()

        count_q = select(func.count(Order.id)).where(Order.id.in_(seller_order_ids))
        if status:
            count_q = count_q.where(Order.status == status)
        if payment_status:
            count_q = count_q.where(Order.payment_status == payment_status)
        total = (await session.execute(count_q)).scalar() or 0

    items = []
    for order in orders:
        items.append(OrderListRead(
            id=order.id,
            order_number=order.order_number,
            status=order.status,
            payment_status=order.payment_status,
            payment_method=order.payment_method,
            total_amount=order.total_amount,
            items_count=len(order.items),
            customer_name=order.user.full_name if order.user else None,
            customer_email=order.user.email if order.user else None,
            placed_at=order.placed_at,
            created_at=order.created_at
        ))

    return PaginatedOrdersAdmin(
        items=items,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{order_id}", response_model=OrderRead)
async def get_order_admin(
    order_id: UUID,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """Get order details (admin)."""
    order_service = OrderService(session)
    order = await order_service.get_order_by_id(order_id)
    
    return build_order_read(order)


@router.patch("/{order_id}/status", response_model=OrderRead)
async def update_order_status(
    order_id: UUID,
    data: UpdateOrderStatus,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """Update order status."""
    order_service = OrderService(session)
    order = await order_service.update_order_status(order_id, data.status)
    return build_order_read(order)


@router.patch("/{order_id}/payment-status", response_model=OrderRead)
async def update_payment_status(
    order_id: UUID,
    data: UpdatePaymentStatus,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """Update payment status."""
    order_service = OrderService(session)
    order = await order_service.update_payment_status(order_id, data.payment_status)
    return build_order_read(order)


@router.post("/{order_id}/cancel", response_model=OrderRead)
async def cancel_order_admin(
    order_id: UUID,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """Cancel an order (admin)."""
    order_service = OrderService(session)
    order = await order_service.cancel_order(order_id)
    return build_order_read(order)
