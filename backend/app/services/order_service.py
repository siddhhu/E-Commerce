"""
Order Service - Order management operations
"""
import secrets
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.exceptions import BadRequestException, NotFoundException, InsufficientStockException
from app.models.order import Order, OrderCreate, OrderItem, OrderStatus, OrderUpdate, PaymentStatus
from app.models.product import Product
from app.models.cart import CartItem
from app.models.address import Address
from app.services.email_service import email_service


class OrderService:
    """Service for order operations."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    def _generate_order_number(self) -> str:
        """Generate unique order number."""
        timestamp = datetime.utcnow().strftime("%Y%m%d")
        random_part = secrets.token_hex(4).upper()
        return f"PRJ-{timestamp}-{random_part}"
    
    async def get_order_by_id(self, order_id: UUID) -> Order:
        """Get order by ID or raise exception."""
        result = await self.session.execute(
            select(Order).where(Order.id == order_id)
        )
        order = result.scalar_one_or_none()
        
        if not order:
            raise NotFoundException("Order")
        
        return order
    
    async def get_order_by_number(self, order_number: str) -> Order:
        """Get order by order number."""
        result = await self.session.execute(
            select(Order).where(Order.order_number == order_number)
        )
        order = result.scalar_one_or_none()
        
        if not order:
            raise NotFoundException("Order")
        
        return order
    
    async def list_user_orders(
        self,
        user_id: UUID,
        skip: int = 0,
        limit: int = 20,
        status: Optional[OrderStatus] = None
    ) -> list[Order]:
        """List orders for a user."""
        query = select(Order).where(Order.user_id == user_id)
        
        if status:
            query = query.where(Order.status == status)
        
        query = query.offset(skip).limit(limit).order_by(Order.created_at.desc())
        
        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def list_all_orders(
        self,
        skip: int = 0,
        limit: int = 20,
        status: Optional[OrderStatus] = None,
        payment_status: Optional[PaymentStatus] = None
    ) -> list[Order]:
        """List all orders (admin)."""
        query = select(Order)
        
        if status:
            query = query.where(Order.status == status)
        if payment_status:
            query = query.where(Order.payment_status == payment_status)
        
        query = query.offset(skip).limit(limit).order_by(Order.created_at.desc())
        
        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def create_order_from_cart(
        self,
        user_id: UUID,
        shipping_address_id: UUID,
        payment_method: str,
        notes: Optional[str] = None
    ) -> Order:
        """Create order from user's cart items."""
        # Verify shipping address belongs to user
        address_result = await self.session.execute(
            select(Address).where(
                Address.id == shipping_address_id,
                Address.user_id == user_id
            )
        )
        address = address_result.scalar_one_or_none()
        
        if not address:
            raise NotFoundException("Shipping address")
        
        # Get cart items
        cart_result = await self.session.execute(
            select(CartItem).where(CartItem.user_id == user_id)
        )
        cart_items = cart_result.scalars().all()
        
        if not cart_items:
            raise BadRequestException("Cart is empty")
        
        # Validate stock and calculate totals
        order_items = []
        subtotal = Decimal("0")
        
        for cart_item in cart_items:
            product_result = await self.session.execute(
                select(Product).where(Product.id == cart_item.product_id)
            )
            product = product_result.scalar_one_or_none()
            
            if not product or not product.is_active:
                raise BadRequestException(f"Product not available: {cart_item.product_id}")
            
            if cart_item.quantity > product.stock_quantity:
                raise InsufficientStockException(product.name)
            
            item_total = product.selling_price * cart_item.quantity
            subtotal += item_total
            
            order_items.append({
                "product": product,
                "quantity": cart_item.quantity,
                "unit_price": product.selling_price,
                "total_price": item_total
            })
        
        # Calculate order totals
        shipping_amount = Decimal("0")  # Free shipping for now
        tax_amount = subtotal * Decimal("0.18")  # 18% GST
        total_amount = subtotal + shipping_amount + tax_amount
        
        # Create order
        order = Order(
            order_number=self._generate_order_number(),
            user_id=user_id,
            shipping_address_id=shipping_address_id,
            payment_method=payment_method,
            notes=notes,
            subtotal=subtotal,
            shipping_amount=shipping_amount,
            tax_amount=tax_amount,
            total_amount=total_amount,
            placed_at=datetime.utcnow()
        )
        
        self.session.add(order)
        await self.session.flush()  # Get order ID
        
        # Create order items and update stock
        for item_data in order_items:
            product = item_data["product"]
            
            order_item = OrderItem(
                order_id=order.id,
                product_id=product.id,
                product_name=product.name,
                product_sku=product.sku,
                unit_price=item_data["unit_price"],
                quantity=item_data["quantity"],
                total_price=item_data["total_price"]
            )
            self.session.add(order_item)
            
            # Reduce stock
            product.stock_quantity -= item_data["quantity"]
            self.session.add(product)
        
        # Clear cart
        for cart_item in cart_items:
            await self.session.delete(cart_item)
        
        await self.session.commit()
        await self.session.refresh(order)
        
        # Send notification emails (async, don't block)
        try:
            # Get user email
            from app.models.user import User
            user_result = await self.session.execute(
                select(User).where(User.id == user_id)
            )
            user = user_result.scalar_one()
            
            await email_service.send_order_confirmation_email(
                user.email,
                order.order_number,
                float(order.total_amount),
                len(order_items)
            )
            
            await email_service.send_order_notification_to_admin(
                order.order_number,
                user.email,
                user.full_name or user.email,
                float(order.total_amount),
                len(order_items)
            )
        except Exception as e:
            print(f"Error sending order emails: {e}")
        
        return order
    
    async def update_order_status(
        self,
        order_id: UUID,
        status: OrderStatus
    ) -> Order:
        """Update order status."""
        order = await self.get_order_by_id(order_id)
        order.status = status
        
        # Update timestamps
        if status == OrderStatus.SHIPPED:
            order.shipped_at = datetime.utcnow()
        elif status == OrderStatus.DELIVERED:
            order.delivered_at = datetime.utcnow()
        
        self.session.add(order)
        await self.session.commit()
        await self.session.refresh(order)
        
        # Send shipped notification
        if status == OrderStatus.SHIPPED:
            try:
                from app.models.user import User
                user_result = await self.session.execute(
                    select(User).where(User.id == order.user_id)
                )
                user = user_result.scalar_one()
                await email_service.send_order_shipped_email(
                    user.email,
                    order.order_number
                )
            except Exception as e:
                print(f"Error sending shipped email: {e}")
        
        return order
    
    async def update_payment_status(
        self,
        order_id: UUID,
        payment_status: PaymentStatus
    ) -> Order:
        """Update order payment status."""
        order = await self.get_order_by_id(order_id)
        order.payment_status = payment_status
        
        # If payment confirmed, update order status
        if payment_status == PaymentStatus.PAID:
            order.status = OrderStatus.CONFIRMED
        
        self.session.add(order)
        await self.session.commit()
        await self.session.refresh(order)
        
        return order
    
    async def cancel_order(self, order_id: UUID, user_id: Optional[UUID] = None) -> Order:
        """Cancel an order and restore stock."""
        order = await self.get_order_by_id(order_id)
        
        # Verify ownership if user_id provided
        if user_id and order.user_id != user_id:
            raise NotFoundException("Order")
        
        # Can only cancel pending/confirmed orders
        if order.status not in [OrderStatus.PENDING, OrderStatus.CONFIRMED]:
            raise BadRequestException("Cannot cancel order at this stage")
        
        # Restore stock
        for item in order.items:
            if item.product_id:
                product_result = await self.session.execute(
                    select(Product).where(Product.id == item.product_id)
                )
                product = product_result.scalar_one_or_none()
                if product:
                    product.stock_quantity += item.quantity
                    self.session.add(product)
        
        order.status = OrderStatus.CANCELLED
        self.session.add(order)
        await self.session.commit()
        await self.session.refresh(order)
        
        return order
    
    async def get_order_stats(self) -> dict:
        """Get order statistics for admin dashboard."""
        from sqlalchemy import func
        
        # Total orders by status
        status_counts = {}
        for status in OrderStatus:
            result = await self.session.execute(
                select(func.count(Order.id)).where(Order.status == status)
            )
            status_counts[status.value] = result.scalar() or 0
        
        # Total revenue
        result = await self.session.execute(
            select(func.sum(Order.total_amount)).where(
                Order.payment_status == PaymentStatus.PAID
            )
        )
        total_revenue = result.scalar() or 0
        
        # Orders today
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        result = await self.session.execute(
            select(func.count(Order.id)).where(Order.created_at >= today_start)
        )
        orders_today = result.scalar() or 0
        
        return {
            "status_counts": status_counts,
            "total_revenue": float(total_revenue),
            "orders_today": orders_today
        }
