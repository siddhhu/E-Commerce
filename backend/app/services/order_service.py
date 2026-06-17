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
from app.core.cache import response_cache
from app.core.delivery import calculate_delivery_fee
from app.services.storage_service import storage_service


def _clear_public_product_cache() -> None:
    for prefix in (
        "products_featured",
        "products_search_index",
        "categories_list",
        "categories_tree",
        "categories_slug",
    ):
        response_cache.clear_prefix(prefix)


class OrderService:
    """Service for order operations."""
    
    def __init__(self, session: AsyncSession):
        self.session = session

    def _get_notification_email(self, user: User) -> str:
        """Prefer the real contact email over phone-generated placeholder emails."""
        return (user.contact_email or user.email).strip().lower()

    async def _recalculate_order_totals(self, order: Order) -> None:
        """Recalculate totals from active order items using GST-inclusive pricing."""
        active_items = [item for item in order.items if not getattr(item, "is_cancelled", False)]
        subtotal = sum((Decimal(str(item.total_price)) for item in active_items), Decimal("0"))

        discount_amount = min(Decimal(str(order.discount_amount or 0)), subtotal)
        shipping_amount = calculate_delivery_fee(subtotal, discount_amount) if active_items else Decimal("0")

        raw_tax_total = Decimal("0")
        product_ids = [item.product_id for item in active_items if item.product_id]
        products: dict[UUID, Product] = {}
        if product_ids:
            product_result = await self.session.execute(
                select(Product).where(Product.id.in_(product_ids))
            )
            products = {product.id: product for product in product_result.scalars().all()}

        for item in active_items:
            product = products.get(item.product_id)
            gst_rate = Decimal(str(getattr(product, "gst_percentage", 18))) if product else Decimal("18")
            line_total = Decimal(str(item.total_price))
            base_price = line_total / (Decimal("1") + gst_rate / Decimal("100"))
            raw_tax_total += line_total - base_price

        if subtotal > 0 and discount_amount > 0:
            discount_ratio = discount_amount / subtotal
            tax_amount = raw_tax_total * (Decimal("1") - discount_ratio)
        else:
            tax_amount = raw_tax_total

        order.subtotal = subtotal.quantize(Decimal("0.01"))
        order.discount_amount = discount_amount.quantize(Decimal("0.01"))
        order.shipping_amount = Decimal(str(shipping_amount)).quantize(Decimal("0.01"))
        order.tax_amount = tax_amount.quantize(Decimal("0.01"))
        order.total_amount = max(
            Decimal("0"),
            order.subtotal - order.discount_amount + order.shipping_amount,
        ).quantize(Decimal("0.01"))
        order.updated_at = datetime.utcnow()
    
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
        background_tasks: Optional[BackgroundTasks] = None,
        # Pre-verified Razorpay details (two-phase checkout — already signature-verified by caller)
        razorpay_payment_id: Optional[str] = None,
        razorpay_order_id: Optional[str] = None,
        razorpay_signature: Optional[str] = None,
    ) -> Order:
        """Create order from user's cart items."""
        address_result = await self.session.execute(
            select(Address).where(
                Address.id == shipping_address_id,
                Address.user_id == user_id
            )
        )
        address = address_result.scalar_one_or_none()
        if not address:
            raise NotFoundException("Shipping address")

        cart_result = await self.session.execute(
            select(CartItem).where(CartItem.user_id == user_id)
        )
        cart_items = cart_result.scalars().all()
        if not cart_items:
            raise BadRequestException("Cart is empty")

        # ── Batch-fetch all products in one query ──────────────────────────
        product_ids = [item.product_id for item in cart_items]
        product_result = await self.session.execute(
            select(Product).where(Product.id.in_(product_ids))
        )
        products = {p.id: p for p in product_result.scalars().all()}
        
        order_items = []
        subtotal = Decimal("0")
        raw_tax_total = Decimal("0")
        
        for cart_item in cart_items:
            product = products.get(cart_item.product_id)
            
            if not product or not product.is_active:
                raise BadRequestException(f"Product not available: {cart_item.product_id}")
            
            if cart_item.quantity > product.stock_quantity:
                raise InsufficientStockException(product.name)
            
            item_total = product.selling_price * cart_item.quantity
            subtotal += item_total
            
            gst_rate = Decimal(str(getattr(product, 'gst_percentage', 18)))
            base_price = item_total / (Decimal("1") + gst_rate / Decimal("100"))
            raw_tax_total += (item_total - base_price)
            
            order_items.append({
                "product": product,
                "quantity": cart_item.quantity,
                "unit_price": product.selling_price,
                "total_price": item_total
            })

        # Apply promo code (discount is applied on GST-inclusive subtotal)
        discount_amount = Decimal("0")
        normalized_promo_code: Optional[str] = None
        if promo_code:
            promo_service = PromoCodeService(self.session)
            promo = await promo_service.validate_for_subtotal(promo_code, subtotal)
            discount_amount = promo_service.compute_valid_discount(promo, subtotal)
            normalized_promo_code = promo.code

        # Calculate order totals (GST-inclusive pricing model).
        shipping_amount = calculate_delivery_fee(subtotal, discount_amount)
        total_amount = max(Decimal("0"), subtotal - discount_amount + shipping_amount)
        
        # Proportionally reduce tax if there's a discount
        if subtotal > 0 and discount_amount > 0:
            discount_ratio = discount_amount / subtotal
            tax_amount = raw_tax_total * (Decimal("1") - discount_ratio)
        else:
            tax_amount = raw_tax_total
            
        tax_amount = tax_amount.quantize(Decimal("0.01"))
        
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
                placed_at=datetime.utcnow()
            )

            print(f"Creating order: {order.order_number}, Method: {payment_method}, Total: {total_amount}")

            # ── Razorpay handling ──────────────────────────────────────────────
            if payment_method == PaymentMethod.ONLINE.value:
                if razorpay_payment_id and razorpay_order_id and razorpay_signature:
                    # Two-phase flow: payment already verified by /checkout/prepare + /checkout/complete
                    # Signature was verified before this function was called — mark as PAID directly.
                    order.razorpay_payment_id = razorpay_payment_id
                    order.razorpay_order_id = razorpay_order_id
                    order.razorpay_signature = razorpay_signature
                    order.payment_status = PaymentStatus.PAID
                    order.status = OrderStatus.CONFIRMED
                    print(f"Online order with pre-verified payment: {razorpay_payment_id}")
                else:
                    # Legacy path (old /checkout endpoint): create Razorpay order here
                    payment_service = PaymentService()
                    try:
                        amount_in_paise = int(total_amount * 100)
                        rzp_order = await payment_service.create_order(
                            amount=amount_in_paise,
                            receipt=order.order_number
                        )
                        order.razorpay_order_id = rzp_order.get("id")
                        print(f"Razorpay order created (legacy): {order.razorpay_order_id}")
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
            
            # Clear cart with a single bulk DELETE (faster than N individual deletes)
            from sqlalchemy import delete as _sql_delete
            await self.session.execute(
                _sql_delete(CartItem).where(CartItem.user_id == user_id)
            )

            await self.session.commit()
            _clear_public_product_cache()

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
                select(Order)
                .where(Order.id == order.id)
                .options(
                    selectinload(Order.items),
                    selectinload(Order.user),
                    selectinload(Order.shipping_address)
                )
            )
            order = result.scalar_one()
            
        except Exception as e:
            await self.session.rollback()
            raise e

        # Send notification emails + generate invoice — ALL offloaded to background tasks
        # so the HTTP response is returned immediately after commit (~2-3s total).
        if background_tasks:
            try:
                # Fetch user for email (one extra query but non-blocking since we already committed)
                from app.models.user import User as _User
                user_result = await self.session.execute(
                    select(_User).where(_User.id == user_id)
                )
                user = user_result.scalar_one()

                background_tasks.add_task(
                    email_service.send_order_confirmation_email,
                    self._get_notification_email(user),
                    order.order_number,
                    float(order.total_amount),
                    len(order_items)
                )

                background_tasks.add_task(
                    email_service.send_order_notification_to_admin,
                    order.order_number,
                    self._get_notification_email(user),
                    user.full_name or user.email,
                    float(order.total_amount),
                    len(order_items)
                )

                # Generate invoice in background — non-blocking.
                # Note: On Vercel serverless the background task runs as long as the
                # connection is alive. The invoice may occasionally miss on very short-lived
                # functions, but the user gets their order confirmation instantly.
                from app.services.invoice_service import InvoiceService
                from app.database import get_session as _get_session
                async def _generate_invoice_bg():
                    """Wrapper: creates its own DB session for the background invoice task."""
                    try:
                        async for bg_session in _get_session():
                            await InvoiceService.generate_and_upload_invoice(order.id, bg_session)
                            break
                    except Exception as e:
                        print(f"[BG] Invoice generation failed for {order.order_number}: {e}")

                background_tasks.add_task(_generate_invoice_bg)

            except Exception as e:
                print(f"Error scheduling order tasks: {e}")

        return order

    
    async def update_order_status(
        self,
        order_id: UUID,
        status: OrderStatus,
        background_tasks: Optional[BackgroundTasks] = None,
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
        _clear_public_product_cache()

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
        order_result = result.scalar_one()
        
        async def _send_status_email() -> None:
            """Send status email after DB commit without blocking admin response."""
            if status == OrderStatus.SHIPPED:
                await email_service.send_order_shipped_email(
                    self._get_notification_email(order_result.user),
                    order.order_number
                )
            else:
                await email_service.send_order_status_update(
                    self._get_notification_email(order_result.user),
                    order.order_number,
                    status.value,
                    order_result.user.full_name or "Customer"
                )

        # Send status update notification.
        try:
            if order_result.user:
                if background_tasks:
                    background_tasks.add_task(_send_status_email)
                else:
                    await _send_status_email()
        except Exception as e:
            print(f"Error sending order status email: {e}")
        
        return order_result
    
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

    async def cancel_order_item(
        self,
        order_id: UUID,
        item_id: UUID,
        reason: Optional[str] = None,
        background_tasks: Optional[BackgroundTasks] = None,
    ) -> Order:
        """Cancel one unavailable line item, recalculate totals, and regenerate invoice."""
        order = await self.get_order_by_id(order_id)

        if order.status in [OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.CANCELLED]:
            raise BadRequestException("Cannot cancel an item after the order is shipped, delivered, or cancelled.")

        item = next((order_item for order_item in order.items if order_item.id == item_id), None)
        if not item:
            raise NotFoundException("Order item")
        if item.is_cancelled:
            raise BadRequestException("This item is already cancelled.")

        previous_total = Decimal(str(order.total_amount or 0))
        previous_invoice_url = order.invoice_url
        cancellation_reason = (reason or "Item unavailable").strip()[:500]

        item.is_cancelled = True
        item.cancelled_at = datetime.utcnow()
        item.cancellation_reason = cancellation_reason
        self.session.add(item)

        await self._recalculate_order_totals(order)

        active_items = [order_item for order_item in order.items if not getattr(order_item, "is_cancelled", False)]
        if not active_items:
            order.status = OrderStatus.CANCELLED
        elif order.status == OrderStatus.PENDING:
            order.status = OrderStatus.CONFIRMED

        metadata = dict(order.order_metadata or {})
        if order.payment_method == PaymentMethod.ONLINE and order.payment_status == PaymentStatus.PAID:
            refund_due = max(Decimal("0"), previous_total - Decimal(str(order.total_amount or 0)))
            if refund_due > 0:
                existing_refund_due = Decimal(str(metadata.get("refund_due_amount") or "0"))
                metadata["refund_due_amount"] = str((existing_refund_due + refund_due).quantize(Decimal("0.01")))
                metadata["refund_reason"] = "One or more order items were cancelled because they were unavailable."
        metadata["last_adjustment_reason"] = cancellation_reason
        metadata["last_adjusted_at"] = datetime.utcnow().isoformat()
        order.order_metadata = metadata

        order.invoice_url = None
        self.session.add(order)
        await self.session.commit()
        _clear_public_product_cache()

        result = await self.session.execute(
            select(Order)
            .where(Order.id == order.id)
            .options(
                selectinload(Order.items),
                selectinload(Order.user),
                selectinload(Order.shipping_address)
            )
        )
        order_result = result.scalar_one()
        has_active_items = any(not getattr(active_item, "is_cancelled", False) for active_item in order_result.items)
        customer_email = self._get_notification_email(order_result.user) if order_result.user else None
        customer_name = order_result.user.full_name if order_result.user and order_result.user.full_name else "Customer"
        order_number = order.order_number
        cancelled_product_name = item.product_name
        cancelled_quantity = item.quantity
        cancelled_amount = float(item.total_price)
        updated_total = float(order_result.total_amount)

        async def _post_adjustment_tasks() -> None:
            try:
                if previous_invoice_url:
                    await storage_service.delete_file(previous_invoice_url)
            except Exception as e:
                print(f"Error deleting old invoice for {order_number}: {e}")

            try:
                from app.services.invoice_service import InvoiceService
                from app.database import get_session as _get_session

                if has_active_items:
                    async for bg_session in _get_session():
                        await InvoiceService.generate_and_upload_invoice(order.id, bg_session)
                        break
            except Exception as e:
                print(f"Error regenerating invoice for {order_number}: {e}")

            try:
                if customer_email:
                    await email_service.send_order_item_cancelled_email(
                        customer_email,
                        order_number,
                        customer_name,
                        cancelled_product_name,
                        cancelled_quantity,
                        cancelled_amount,
                        updated_total,
                        cancellation_reason,
                    )
            except Exception as e:
                print(f"Error sending item cancellation email for {order_number}: {e}")

        if background_tasks:
            background_tasks.add_task(_post_adjustment_tasks)
        else:
            await _post_adjustment_tasks()

        return order_result
    
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
            if getattr(item, "is_cancelled", False):
                continue
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
