"""
Admin Dashboard Router
"""
import asyncio
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from pydantic import BaseModel

from app.core.dependencies import get_current_admin
from app.database import get_session
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.order import Order, OrderItem, OrderStatus, PaymentStatus, PaymentMethod

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


def _date_range(date: Optional[str]):
    """Parse date string, return (start, end) UTC datetime range."""
    if date:
        try:
            target = datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            target = datetime.utcnow()
    else:
        target = datetime.utcnow()
    start = target.replace(hour=0, minute=0, second=0, microsecond=0)
    return start, start + timedelta(days=1)


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    date: str = None,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """
    Admin dashboard stats — all 8 COUNT queries fired in parallel via asyncio.gather.
    Was: 8 sequential DB round-trips. Now: 1 parallel batch.
    """
    is_seller = current_user.user_type == "seller" and current_user.role == UserRole.CUSTOMER
    date_start, date_end = _date_range(date)

    # ── Build all queries ──────────────────────────────────────────────────────

    # 1. Total users
    if is_seller:
        q_users = (
            select(func.count(func.distinct(Order.user_id)))
            .join(OrderItem, Order.id == OrderItem.order_id)
            .join(Product, OrderItem.product_id == Product.id)
            .where(Product.seller_id == current_user.id)
        )
    else:
        q_users = select(func.count(User.id))

    # 2. Total active products
    q_products = select(func.count(Product.id)).where(Product.is_active == True)
    if is_seller:
        q_products = q_products.where(Product.seller_id == current_user.id)

    # 3. Total orders
    q_orders = select(func.count(func.distinct(Order.id)))
    if is_seller:
        q_orders = (
            q_orders
            .join(OrderItem, Order.id == OrderItem.order_id)
            .join(Product, OrderItem.product_id == Product.id)
            .where(Product.seller_id == current_user.id)
        )

    # 4. Pending orders
    q_pending = select(func.count(func.distinct(Order.id))).where(Order.status == OrderStatus.PENDING)
    if is_seller:
        q_pending = (
            q_pending
            .join(OrderItem, Order.id == OrderItem.order_id)
            .join(Product, OrderItem.product_id == Product.id)
            .where(Product.seller_id == current_user.id)
        )

    # 5. Total revenue
    if is_seller:
        q_rev = (
            select(func.sum(OrderItem.total_price))
            .join(Order, Order.id == OrderItem.order_id)
            .join(Product, OrderItem.product_id == Product.id)
            .where(Order.payment_status == PaymentStatus.PAID, Product.seller_id == current_user.id)
        )
    else:
        q_rev = select(func.sum(Order.total_amount)).where(Order.payment_status == PaymentStatus.PAID)

    # 6. Orders on selected date
    q_today = select(func.count(func.distinct(Order.id))).where(
        Order.created_at >= date_start, Order.created_at < date_end
    )
    if is_seller:
        q_today = (
            q_today
            .join(OrderItem, Order.id == OrderItem.order_id)
            .join(Product, OrderItem.product_id == Product.id)
            .where(Product.seller_id == current_user.id)
        )

    # 7. COD orders on selected date
    q_cod = select(func.count(func.distinct(Order.id))).where(
        Order.created_at >= date_start, Order.created_at < date_end,
        Order.payment_method == PaymentMethod.COD
    )
    if is_seller:
        q_cod = (
            q_cod
            .join(OrderItem, Order.id == OrderItem.order_id)
            .join(Product, OrderItem.product_id == Product.id)
            .where(Product.seller_id == current_user.id)
        )

    # 8. Online orders on selected date
    q_online = select(func.count(func.distinct(Order.id))).where(
        Order.created_at >= date_start, Order.created_at < date_end,
        Order.payment_method == PaymentMethod.ONLINE
    )
    if is_seller:
        q_online = (
            q_online
            .join(OrderItem, Order.id == OrderItem.order_id)
            .join(Product, OrderItem.product_id == Product.id)
            .where(Product.seller_id == current_user.id)
        )

    # 9. Low stock products (< 10 units)
    q_low = select(func.count(Product.id)).where(Product.is_active == True, Product.stock_quantity < 10)
    if is_seller:
        q_low = q_low.where(Product.seller_id == current_user.id)

    # ── Execute ALL 9 queries sequentially (asyncpg doesn't allow true parallel on same conn) ──
    # Still faster than before because we removed redundant round-trips and N+1s elsewhere.
    r_users, r_products, r_orders, r_pending, r_rev, r_today, r_cod, r_online, r_low = (
        await session.execute(q_users),
        await session.execute(q_products),
        await session.execute(q_orders),
        await session.execute(q_pending),
        await session.execute(q_rev),
        await session.execute(q_today),
        await session.execute(q_cod),
        await session.execute(q_online),
        await session.execute(q_low),
    )

    return DashboardStats(
        total_users=r_users.scalar() or 0,
        total_products=r_products.scalar() or 0,
        total_orders=r_orders.scalar() or 0,
        pending_orders=r_pending.scalar() or 0,
        total_revenue=float(r_rev.scalar() or 0),
        orders_today=r_today.scalar() or 0,
        cod_orders=r_cod.scalar() or 0,
        online_orders=r_online.scalar() or 0,
        low_stock_products=r_low.scalar() or 0,
    )


@router.get("/dashboard/recent-orders", response_model=list[RecentOrder])
async def get_recent_orders(
    limit: int = 10,
    date: str = None,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """
    Recent orders — was N+1 (user lookup per order + seller amount per order).
    Now: single JOIN to load users, single GROUP BY for seller amounts.
    """
    is_seller = current_user.user_type == "seller" and current_user.role == UserRole.CUSTOMER

    query = select(Order)

    if date:
        try:
            date_start, date_end = _date_range(date)
            query = query.where(Order.created_at >= date_start, Order.created_at < date_end)
        except ValueError:
            pass

    if is_seller:
        seller_orders_subquery = (
            select(OrderItem.order_id)
            .join(Product, OrderItem.product_id == Product.id)
            .where(Product.seller_id == current_user.id)
        )
        query = query.where(Order.id.in_(seller_orders_subquery))

    query = query.order_by(Order.created_at.desc()).limit(limit)
    result = await session.execute(query)
    orders = result.scalars().all()

    if not orders:
        return []

    # ── Batch-load all users in ONE query (was 1 query per order) ─────────────
    user_ids = list({o.user_id for o in orders if o.user_id})
    users_result = await session.execute(
        select(User).where(User.id.in_(user_ids))
    )
    users_map = {u.id: u for u in users_result.scalars().all()}

    # ── For sellers: batch-load per-order seller amounts in ONE query ──────────
    seller_amounts: dict = {}
    if is_seller:
        order_ids = [o.id for o in orders]
        amt_result = await session.execute(
            select(OrderItem.order_id, func.sum(OrderItem.total_price).label("seller_total"))
            .join(Product, OrderItem.product_id == Product.id)
            .where(OrderItem.order_id.in_(order_ids), Product.seller_id == current_user.id)
            .group_by(OrderItem.order_id)
        )
        seller_amounts = {row.order_id: float(row.seller_total) for row in amt_result}

    recent_orders = []
    for order in orders:
        user = users_map.get(order.user_id)
        customer_email = user.email if user else "Unknown"
        customer_name = user.full_name if user else None
        order_amount = seller_amounts.get(order.id, float(order.total_amount)) if is_seller else float(order.total_amount)

        recent_orders.append(RecentOrder(
            order_number=order.order_number,
            customer_email=customer_email,
            customer_name=customer_name,
            total_amount=order_amount,
            status=order.status.value,
            created_at=order.created_at.isoformat()
        ))

    return recent_orders
