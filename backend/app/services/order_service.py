"""
Order Service - Order management operations
"""
import secrets
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.core.exceptions import BadRequestException, NotFoundException, InsufficientStockException
from app.models.order import Order, OrderCreate, OrderItem, OrderStatus, OrderUpdate, PaymentStatus
from app.models.product import Product
from app.models.cart import CartItem
from app.models.address import Address
from app.models.user import User
from app.services.email_service import email_service
from app.services.payment_service import PaymentService
from app.models.order import PaymentMethod
from fastapi import BackgroundTasks
from app.services.promo_code_service import PromoCodeService
from app.models.user import UserType


class OrderService:
    """Service for order operations."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    def _generate_order_number(self) -> str:
        """Generate unique order number."""
        timestamp = datetime.utcnow().strftime("%Y%m%d")
        random_part = secrets.token_hex(4).upper()
        return f"PRJ-{timestamp}-{random_part}"
    
    async def get_order_by_id(self, order_id: str | UUID) -> Order:
        """Get an order by ID."""
        if isinstance(order_id, str):
            order_id = UUID(order_id)
            
        result = await self.session.execute(
            select(Order)
            .where(Order.id == order_id)
            .options(
                selectinload(Order.items),
                selectinload(Order.user),
                selectinload(Order.shipping_address)
            )
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
        query = select(Order).where(Order.user_id == user_id).options(selectinload(Order.items))
        
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
        query = select(Order).options(
            selectinload(Order.items),
            selectinload(Order.user)
        )
        
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
        notes: Optional[str] = None,
        promo_code: Optional[str] = None,
        invoice_url: Optional[str] = None,
        background_tasks: Optional[BackgroundTasks] = None
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
        
        # Validate stock and calculate totals (BATCH FETCH)
        product_ids = [item.product_id for item in cart_items]
        product_result = await self.session.execute(
            select(Product).where(Product.id.in_(product_ids))
        )
        products = {p.id: p for p in product_result.scalars().all()}
        
        order_items = []
        subtotal = Decimal("0")
        
        for cart_item in cart_items:
            product = products.get(cart_item.product_id)
            
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

        # Enforce seller invoice
        user_result = await self.session.execute(
            select(User).where(User.id == user_id)
        )
        user = user_result.scalar_one_or_none()
        if user and user.user_type == UserType.seller:
            if not invoice_url:
                raise BadRequestException("Invoice upload is required for sellers")

        # Apply promo code (discount is applied on GST-inclusive subtotal)
        discount_amount = Decimal("0")
        normalized_promo_code: Optional[str] = None
        if promo_code:
            promo_service = PromoCodeService(self.session)
            promo = await promo_service.validate_for_subtotal(promo_code, subtotal)
            discount_amount = promo_service.compute_discount(promo, subtotal)
            normalized_promo_code = promo.code

        # Calculate order totals (GST-inclusive pricing model)
        shipping_amount = Decimal("0")  # Free shipping for now
        total_amount = max(Decimal("0"), subtotal - discount_amount + shipping_amount)
        tax_amount = total_amount - (total_amount / Decimal("1.18"))
        
        # Create order
        try:
            # Prepare address data snapshot
            shipping_address_data = {
                "full_name": address.full_name,
                "phone": address.phone,
                "address_line1": address.address_line1,
                "address_line2": address.address_line2,
                "city": address.city,
                "state": address.state,
                "postal_code": address.postal_code,
                "country": address.country
            }
            
            order = Order(
                order_number=self._generate_order_number(),
                user_id=user_id,
                shipping_address_id=shipping_address_id,
                shipping_address_data=shipping_address_data,
                payment_method=payment_method,
                notes=notes,
                subtotal=subtotal,
                promo_code=normalized_promo_code,
                discount_amount=discount_amount,
                shipping_amount=shipping_amount,
                tax_amount=tax_amount,
                total_amount=total_amount,
                invoice_url=invoice_url,
                placed_at=datetime.utcnow()
            )
            
            print(f"Creating order: {order.order_number}, Method: {payment_method}, Total: {total_amount}")
            
            # Create Razorpay order if online
            if payment_method == PaymentMethod.ONLINE.value:
                payment_service = PaymentService()
                try:
                    # Razorpay amount is in paise (total_amount * 100)
                    amount_in_paise = int(total_amount * 100)
                    rzp_order = await payment_service.create_order(
                        amount=amount_in_paise,
                        receipt=order.order_number
                    )
                    order.razorpay_order_id = rzp_order.get("id")
                    print(f"Razorpay order created: {order.razorpay_order_id}")
                except Exception as e:
                    print(f"Error creating Razorpay order: {e}")
                    raise BadRequestException(f"Failed to initiate online payment: {str(e)}")
            
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

            # Mark promo as used after successful commit
            if normalized_promo_code:
                promo_service = PromoCodeService(self.session)
                try:
                    promo = await promo_service.get_by_code(normalized_promo_code)
                    await promo_service.mark_used(promo)
                except Exception:
                    # Non-critical
                    pass
            
            # Re-fetch order with items eagerly loaded to avoid async lazy load error during serialization
            result = await self.session.execute(
                select(Order).where(Order.id == order.id).options(selectinload(Order.items))
            )
            order = result.scalar_one()
            
        except Exception as e:
            await self.session.rollback()
            raise e
        
        # Send notification emails (OFFLOADED TO BACKGROUND TASKS)
        if background_tasks:
            try:
                # Get user email
                if not user:
                    from app.models.user import User as _User
                    user_result = await self.session.execute(
                        select(_User).where(_User.id == user_id)
                    )
                    user = user_result.scalar_one()
                
                background_tasks.add_task(
                    email_service.send_order_confirmation_email,
                    user.email,
                    order.order_number,
                    float(order.total_amount),
                    len(order_items)
                )
                
                background_tasks.add_task(
                    email_service.send_order_notification_to_admin,
                    order.order_number,
                    user.email,
                    user.full_name or user.email,
                    float(order.total_amount),
                    len(order_items)
                )
            except Exception as e:
                print(f"Error scheduling order emails: {e}")
        
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

        # Load relationships for response model
        result = await self.session.execute(
            select(Order)
            .where(Order.id == order.id)
            .options(
                selectinload(Order.items),
                selectinload(Order.user),
                selectinload(Order.shipping_address)
            )
        )
        return result.scalar_one()
        
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

        # Load relationships for response model
        result = await self.session.execute(
            select(Order)
            .where(Order.id == order.id)
            .options(
                selectinload(Order.items),
                selectinload(Order.user),
                selectinload(Order.shipping_address)
            )
        )
        return result.scalar_one()
    
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

        # Load relationships for response model
        result = await self.session.execute(
            select(Order)
            .where(Order.id == order.id)
            .options(
                selectinload(Order.items),
                selectinload(Order.user),
                selectinload(Order.shipping_address)
            )
        )
        return result.scalar_one()
    
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
