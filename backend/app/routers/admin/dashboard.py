"""
Admin Dashboard Router
"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import case, func
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
    Admin dashboard stats with aggregate SQL.
    Super admin: 3 DB round-trips. Seller: 2 DB round-trips.
    """
    is_seller = current_user.user_type == "seller" and current_user.role == UserRole.CUSTOMER
    date_start, date_end = _date_range(date)
    date_condition = (Order.created_at >= date_start) & (Order.created_at < date_end)

    if is_seller:
        product_stats_query = (
            select(
                func.count(Product.id).label("total_products"),
                func.coalesce(
                    func.sum(case((Product.stock_quantity < 10, 1), else_=0)),
                    0,
                ).label("low_stock_products"),
            )
            .where(Product.is_active == True, Product.seller_id == current_user.id)
        )
        order_stats_query = (
            select(
                func.count(func.distinct(Order.id)).label("total_orders"),
                func.count(func.distinct(Order.user_id)).label("total_users"),
                func.count(func.distinct(case((Order.status == OrderStatus.PENDING, Order.id)))).label("pending_orders"),
                func.coalesce(
                    func.sum(case((Order.payment_status == PaymentStatus.PAID, OrderItem.total_price), else_=0)),
                    0,
                ).label("total_revenue"),
                func.count(func.distinct(case((date_condition, Order.id)))).label("orders_today"),
                func.count(
                    func.distinct(case((date_condition & (Order.payment_method == PaymentMethod.COD), Order.id)))
                ).label("cod_orders"),
                func.count(
                    func.distinct(case((date_condition & (Order.payment_method == PaymentMethod.ONLINE), Order.id)))
                ).label("online_orders"),
            )
            .select_from(OrderItem)
            .join(Order, Order.id == OrderItem.order_id)
            .join(Product, OrderItem.product_id == Product.id)
            .where(Product.seller_id == current_user.id)
        )

        product_stats = (await session.execute(product_stats_query)).one()
        order_stats = (await session.execute(order_stats_query)).one()

        return DashboardStats(
            total_users=order_stats.total_users or 0,
            total_products=product_stats.total_products or 0,
            total_orders=order_stats.total_orders or 0,
            pending_orders=order_stats.pending_orders or 0,
            total_revenue=float(order_stats.total_revenue or 0),
            orders_today=order_stats.orders_today or 0,
            cod_orders=order_stats.cod_orders or 0,
            online_orders=order_stats.online_orders or 0,
            low_stock_products=product_stats.low_stock_products or 0,
        )

    users_query = select(func.count(User.id))
    product_stats_query = (
        select(
            func.count(Product.id).label("total_products"),
            func.coalesce(
                func.sum(case((Product.stock_quantity < 10, 1), else_=0)),
                0,
            ).label("low_stock_products"),
        )
        .where(Product.is_active == True)
    )
    order_stats_query = select(
        func.count(Order.id).label("total_orders"),
        func.coalesce(
            func.sum(case((Order.status == OrderStatus.PENDING, 1), else_=0)),
            0,
        ).label("pending_orders"),
        func.coalesce(
            func.sum(case((Order.payment_status == PaymentStatus.PAID, Order.total_amount), else_=0)),
            0,
        ).label("total_revenue"),
        func.coalesce(func.sum(case((date_condition, 1), else_=0)), 0).label("orders_today"),
        func.coalesce(
            func.sum(case((date_condition & (Order.payment_method == PaymentMethod.COD), 1), else_=0)),
            0,
        ).label("cod_orders"),
        func.coalesce(
            func.sum(case((date_condition & (Order.payment_method == PaymentMethod.ONLINE), 1), else_=0)),
            0,
        ).label("online_orders"),
    )

    total_users = (await session.execute(users_query)).scalar() or 0
    product_stats = (await session.execute(product_stats_query)).one()
    order_stats = (await session.execute(order_stats_query)).one()

    return DashboardStats(
        total_users=total_users,
        total_products=product_stats.total_products or 0,
        total_orders=order_stats.total_orders or 0,
        pending_orders=order_stats.pending_orders or 0,
        total_revenue=float(order_stats.total_revenue or 0),
        orders_today=order_stats.orders_today or 0,
        cod_orders=order_stats.cod_orders or 0,
        online_orders=order_stats.online_orders or 0,
        low_stock_products=product_stats.low_stock_products or 0,
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
