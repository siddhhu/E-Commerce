"""
Admin Dashboard Router
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlmodel import select
from pydantic import BaseModel
from typing import Optional

from app.core.dependencies import get_current_admin
from app.database import get_session
from app.models.user import User
from app.models.product import Product
from app.models.order import Order, OrderStatus, PaymentStatus, PaymentMethod
from app.services.order_service import OrderService

router = APIRouter()


class DashboardStats(BaseModel):
    """Dashboard statistics."""
    total_users: int
    total_products: int
    total_orders: int
    pending_orders: int
    total_revenue: float
    orders_today: int
    cod_orders: int = 0
    online_orders: int = 0
    low_stock_products: int


class RecentOrder(BaseModel):
    """Recent order summary."""
    order_number: str
    customer_email: str
    customer_name: Optional[str] = None
    total_amount: float
    status: str
    created_at: str


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    date: str = None,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """Get admin dashboard statistics."""
    # Total users
    result = await session.execute(select(func.count(User.id)))
    total_users = result.scalar() or 0
    
    # Total products
    result = await session.execute(
        select(func.count(Product.id)).where(Product.is_active == True)
    )
    total_products = result.scalar() or 0
    
    # Total orders
    result = await session.execute(select(func.count(Order.id)))
    total_orders = result.scalar() or 0
    
    # Pending orders
    result = await session.execute(
        select(func.count(Order.id)).where(Order.status == OrderStatus.PENDING)
    )
    pending_orders = result.scalar() or 0
    
    # Total revenue
    result = await session.execute(
        select(func.sum(Order.total_amount)).where(
            Order.payment_status == PaymentStatus.PAID
        )
    )
    total_revenue = float(result.scalar() or 0)
    
    # Date filtering for daily stats
    from datetime import datetime, timedelta
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            target_date = datetime.utcnow()
    else:
        target_date = datetime.utcnow()
        
    date_start = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    date_end = date_start + timedelta(days=1)
    
    # Orders on selected date
    result = await session.execute(
        select(func.count(Order.id)).where(
            Order.created_at >= date_start,
            Order.created_at < date_end
        )
    )
    orders_today = result.scalar() or 0
    
    # COD orders on selected date
    result = await session.execute(
        select(func.count(Order.id)).where(
            Order.created_at >= date_start,
            Order.created_at < date_end,
            Order.payment_method == PaymentMethod.COD
        )
    )
    cod_orders = result.scalar() or 0

    # Online orders on selected date
    result = await session.execute(
        select(func.count(Order.id)).where(
            Order.created_at >= date_start,
            Order.created_at < date_end,
            Order.payment_method == PaymentMethod.ONLINE
        )
    )
    online_orders = result.scalar() or 0
    
    # Low stock products (< 10)
    result = await session.execute(
        select(func.count(Product.id)).where(
            Product.is_active == True,
            Product.stock_quantity < 10
        )
    )
    low_stock_products = result.scalar() or 0
    
    return DashboardStats(
        total_users=total_users,
        total_products=total_products,
        total_orders=total_orders,
        pending_orders=pending_orders,
        total_revenue=total_revenue,
        orders_today=orders_today,
        cod_orders=cod_orders,
        online_orders=online_orders,
        low_stock_products=low_stock_products
    )


@router.get("/dashboard/recent-orders", response_model=list[RecentOrder])
async def get_recent_orders(
    limit: int = 10,
    date: str = None,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """Get recent orders for dashboard."""
    query = select(Order)
    
    from datetime import datetime, timedelta
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d")
            date_start = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
            date_end = date_start + timedelta(days=1)
            query = query.where(Order.created_at >= date_start, Order.created_at < date_end)
        except ValueError:
            pass
            
    query = query.order_by(Order.created_at.desc()).limit(limit)
    result = await session.execute(query)
    orders = result.scalars().all()
    
    recent_orders = []
    for order in orders:
        # Get customer email
        customer_email = "Unknown"
        customer_name = None
        if order.user_id:
            user_result = await session.execute(
                select(User).where(User.id == order.user_id)
            )
            user = user_result.scalar_one_or_none()
            if user:
                customer_email = user.email
                customer_name = user.full_name
        
        recent_orders.append(RecentOrder(
            order_number=order.order_number,
            customer_email=customer_email,
            customer_name=customer_name,
            total_amount=float(order.total_amount),
            status=order.status.value,
            created_at=order.created_at.isoformat()
        ))
    
    return recent_orders
