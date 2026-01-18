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
from app.models.order import OrderListRead, OrderRead, OrderStatus, PaymentStatus
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
    """List all orders (admin)."""
    order_service = OrderService(session)
    
    skip = (page - 1) * page_size
    
    orders = await order_service.list_all_orders(
        skip=skip,
        limit=page_size,
        status=status,
        payment_status=payment_status
    )
    
    items = []
    for order in orders:
        items.append(OrderListRead(
            id=order.id,
            order_number=order.order_number,
            status=order.status,
            payment_status=order.payment_status,
            total_amount=order.total_amount,
            items_count=len(order.items),
            placed_at=order.placed_at,
            created_at=order.created_at
        ))
    
    # Count total
    from sqlalchemy import func
    from sqlmodel import select
    from app.models.order import Order
    
    count_query = select(func.count(Order.id))
    if status:
        count_query = count_query.where(Order.status == status)
    if payment_status:
        count_query = count_query.where(Order.payment_status == payment_status)
    result = await session.execute(count_query)
    total = result.scalar() or 0
    
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
    return await order_service.get_order_by_id(order_id)


@router.patch("/{order_id}/status", response_model=OrderRead)
async def update_order_status(
    order_id: UUID,
    data: UpdateOrderStatus,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """Update order status."""
    order_service = OrderService(session)
    return await order_service.update_order_status(order_id, data.status)


@router.patch("/{order_id}/payment-status", response_model=OrderRead)
async def update_payment_status(
    order_id: UUID,
    data: UpdatePaymentStatus,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """Update payment status."""
    order_service = OrderService(session)
    return await order_service.update_payment_status(order_id, data.payment_status)


@router.post("/{order_id}/cancel", response_model=OrderRead)
async def cancel_order_admin(
    order_id: UUID,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """Cancel an order (admin)."""
    order_service = OrderService(session)
    return await order_service.cancel_order(order_id)
