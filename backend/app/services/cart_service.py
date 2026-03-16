"""
Cart Service - Shopping cart operations
"""
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.cart import CartItem, CartItemWithProduct
from app.models.product import Product


class CartService:
    """Service for cart operations."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_cart_items(self, user_id: UUID) -> list[CartItemWithProduct]:
        """Get all cart items for a user with product details."""
        result = await self.session.execute(
            select(CartItem).where(CartItem.user_id == user_id)
        )
        cart_items = result.scalars().all()
        
        items_with_products = []
        for item in cart_items:
            # Fetch product
            product_result = await self.session.execute(
                select(Product).where(Product.id == item.product_id)
            )
            product = product_result.scalar_one_or_none()
            
            if product:
                # Get primary image
                primary_image = None
                if product.images:
                    primary = next((img for img in product.images if img.is_primary), None)
                    primary_image = primary.image_url if primary else (
                        product.images[0].image_url if product.images else None
                    )
                
                items_with_products.append(CartItemWithProduct(
                    id=item.id,
                    user_id=item.user_id,
                    product_id=item.product_id,
                    quantity=item.quantity,
                    created_at=item.created_at,
                    updated_at=item.updated_at,
                    product_name=product.name,
                    product_slug=product.slug,
                    product_sku=product.sku,
                    unit_price=float(product.selling_price),
                    primary_image=primary_image,
                    total_price=float(product.selling_price * item.quantity)
                ))
        
        return items_with_products
    
    async def add_to_cart(
        self,
        user_id: UUID,
        product_id: UUID,
        quantity: int = 1
    ) -> CartItem:
        """Add a product to cart or update quantity if exists."""
        # Verify product exists and is active
        product_result = await self.session.execute(
            select(Product).where(
                Product.id == product_id,
                Product.is_active == True
            )
        )
        product = product_result.scalar_one_or_none()
        
        if not product:
            raise NotFoundException("Product")
        
        # Check stock
        if quantity > product.stock_quantity:
            raise BadRequestException(
                f"Only {product.stock_quantity} units available in stock"
            )
        
        # Check min order quantity
        if quantity < product.min_order_quantity:
            raise BadRequestException(
                f"Minimum order quantity is {product.min_order_quantity}"
            )
        
        # Check if item already in cart
        result = await self.session.execute(
            select(CartItem).where(
                CartItem.user_id == user_id,
                CartItem.product_id == product_id
            )
        )
        existing_item = result.scalar_one_or_none()
        
        if existing_item:
            new_quantity = existing_item.quantity + quantity
            if new_quantity > product.stock_quantity:
                raise BadRequestException(
                    f"Only {product.stock_quantity} units available in stock"
                )
            existing_item.quantity = new_quantity
            self.session.add(existing_item)
            await self.session.commit()
            await self.session.refresh(existing_item)
            return existing_item
        
        # Create new cart item
        cart_item = CartItem(
            user_id=user_id,
            product_id=product_id,
            quantity=quantity
        )
        
        self.session.add(cart_item)
        await self.session.commit()
        await self.session.refresh(cart_item)
        
        return cart_item
    
    async def update_cart_item(
        self,
        user_id: UUID,
        item_id: UUID,
        quantity: int
    ) -> CartItem:
        """Update cart item quantity."""
        result = await self.session.execute(
            select(CartItem).where(
                CartItem.id == item_id,
                CartItem.user_id == user_id
            )
        )
        cart_item = result.scalar_one_or_none()
        
        if not cart_item:
            raise NotFoundException("Cart item")
        
        # Verify stock
        product_result = await self.session.execute(
            select(Product).where(Product.id == cart_item.product_id)
        )
        product = product_result.scalar_one_or_none()
        
        if quantity > product.stock_quantity:
            raise BadRequestException(
                f"Only {product.stock_quantity} units available in stock"
            )
        
        if quantity < product.min_order_quantity:
            raise BadRequestException(
                f"Minimum order quantity is {product.min_order_quantity}"
            )
        
        cart_item.quantity = quantity
        self.session.add(cart_item)
        await self.session.commit()
        await self.session.refresh(cart_item)
        
        return cart_item
    
    async def remove_from_cart(self, user_id: UUID, item_id: UUID) -> None:
        """Remove item from cart."""
        result = await self.session.execute(
            select(CartItem).where(
                CartItem.id == item_id,
                CartItem.user_id == user_id
            )
        )
        cart_item = result.scalar_one_or_none()
        
        if not cart_item:
            raise NotFoundException("Cart item")
        
        await self.session.delete(cart_item)
        await self.session.commit()
    
    async def clear_cart(self, user_id: UUID) -> None:
        """Clear all items from user's cart."""
        result = await self.session.execute(
            select(CartItem).where(CartItem.user_id == user_id)
        )
        cart_items = result.scalars().all()
        
        for item in cart_items:
            await self.session.delete(item)
        
        await self.session.commit()
    
    async def get_cart_total(self, user_id: UUID) -> dict:
        """Get cart summary with totals."""
        items = await self.get_cart_items(user_id)
        
        subtotal = sum(item.total_price for item in items)
        items_count = sum(item.quantity for item in items)
        
        return {
            "items": items,
            "items_count": items_count,
            "subtotal": subtotal,
            "currency": "INR"
        }
