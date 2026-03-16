"""
Orders Router - Order history endpoints
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.dependencies import get_current_active_user
from app.database import get_session
from app.models.order import OrderListRead, OrderRead, OrderStatus
from app.models.user import User
from app.services.order_service import OrderService
from app.services.payment_service import PaymentService
from app.core.exceptions import BadRequestException

router = APIRouter()


class PaginatedOrders(BaseModel):
    """Paginated orders response."""
    items: list[OrderListRead]
    total: int
    page: int
    page_size: int


@router.get("", response_model=PaginatedOrders)
async def list_my_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[OrderStatus] = None,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Get current user's order history."""
    order_service = OrderService(session)
    
    skip = (page - 1) * page_size
    
    orders = await order_service.list_user_orders(
        user_id=current_user.id,
        skip=skip,
        limit=page_size,
        status=status
    )
    
    # Transform to list format
    items = []
    for order in orders:
        product_names = [item.product_name for item in order.items]
        product_summary = ", ".join(product_names)
        
        items.append(OrderListRead(
            id=order.id,
            order_number=order.order_number,
            status=order.status,
            payment_status=order.payment_status,
            total_amount=order.total_amount,
            items_count=len(order.items),
            product_summary=product_summary,
            placed_at=order.placed_at,
            created_at=order.created_at
        ))
    
    # Count total
    from sqlalchemy import func
    from sqlmodel import select
    from app.models.order import Order
    
    count_query = select(func.count(Order.id)).where(Order.user_id == current_user.id)
    if status:
        count_query = count_query.where(Order.status == status)
    result = await session.execute(count_query)
    total = result.scalar() or 0
    
    return PaginatedOrders(
        items=items,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{order_id}", response_model=OrderRead)
async def get_order_details(
    order_id: UUID,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Get order details."""
    order_service = OrderService(session)
    order = await order_service.get_order_by_id(order_id)
    
    # Verify ownership
    from app.core.exceptions import NotFoundException
    if order.user_id != current_user.id:
        raise NotFoundException("Order")
    
    return order


@router.post("/{order_id}/cancel", response_model=OrderRead)
async def cancel_order(
    order_id: UUID,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Cancel an order."""
    order_service = OrderService(session)
    return await order_service.cancel_order(order_id, current_user.id)


class PaymentVerificationRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str


@router.post("/{order_id}/verify-payment", response_model=OrderRead)
async def verify_payment(
    order_id: UUID,
    data: PaymentVerificationRequest,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Verify Razorpay payment signature."""
    order_service = OrderService(session)
    order = await order_service.get_order_by_id(order_id)
    
    # Verify ownership
    from app.core.exceptions import NotFoundException
    if order.user_id != current_user.id:
        raise NotFoundException("Order")
        
    payment_service = PaymentService()
    is_valid = payment_service.verify_payment_signature(
        data.razorpay_order_id,
        data.razorpay_payment_id,
        data.razorpay_signature
    )
    
    if not is_valid:
        # Update as failed
        from app.models.order import PaymentStatus
        await order_service.update_payment_status(order_id, PaymentStatus.FAILED)
        raise BadRequestException("Invalid payment signature")
        
    # Save razorpay details to order and mark paid
    order.razorpay_payment_id = data.razorpay_payment_id
    order.razorpay_signature = data.razorpay_signature
    session.add(order)
    await session.commit()
    
    from app.models.order import PaymentStatus
    return await order_service.update_payment_status(order_id, PaymentStatus.PAID)
