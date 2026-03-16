"""
Wishlist Router - Wishlist endpoints
"""
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.dependencies import get_current_active_user
from app.core.exceptions import ConflictException, NotFoundException
from app.database import get_session
from app.models.product import Product
from app.models.user import User
from app.models.wishlist import WishlistItem, WishlistItemCreate, WishlistItemRead, WishlistItemWithProduct

router = APIRouter()


@router.get("", response_model=list[WishlistItemWithProduct])
async def get_wishlist(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Get current user's wishlist."""
    result = await session.execute(
        select(WishlistItem).where(WishlistItem.user_id == current_user.id)
    )
    wishlist_items = result.scalars().all()
    
    items = []
    for item in wishlist_items:
        product_result = await session.execute(
            select(Product).where(Product.id == item.product_id)
        )
        product = product_result.scalar_one_or_none()
        
        if product:
            primary_image = None
            if product.images:
                primary = next((img for img in product.images if img.is_primary), None)
                primary_image = primary.image_url if primary else (
                    product.images[0].image_url if product.images else None
                )
            
            items.append(WishlistItemWithProduct(
                id=item.id,
                user_id=item.user_id,
                product_id=item.product_id,
                created_at=item.created_at,
                product_name=product.name,
                product_slug=product.slug,
                product_sku=product.sku,
                selling_price=float(product.selling_price),
                mrp=float(product.mrp),
                primary_image=primary_image,
                is_in_stock=product.stock_quantity > 0
            ))
    
    return items


@router.post("", response_model=WishlistItemRead, status_code=201)
async def add_to_wishlist(
    data: WishlistItemCreate,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Add product to wishlist."""
    # Check if product exists
    product_result = await session.execute(
        select(Product).where(
            Product.id == data.product_id,
            Product.is_active == True
        )
    )
    product = product_result.scalar_one_or_none()
    
    if not product:
        raise NotFoundException("Product")
    
    # Check if already in wishlist
    existing = await session.execute(
        select(WishlistItem).where(
            WishlistItem.user_id == current_user.id,
            WishlistItem.product_id == data.product_id
        )
    )
    if existing.scalar_one_or_none():
        raise ConflictException("Product already in wishlist")
    
    wishlist_item = WishlistItem(
        user_id=current_user.id,
        product_id=data.product_id
    )
    
    session.add(wishlist_item)
    await session.commit()
    await session.refresh(wishlist_item)
    
    return wishlist_item


@router.delete("/{item_id}", status_code=204)
async def remove_from_wishlist(
    item_id: UUID,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Remove item from wishlist."""
    result = await session.execute(
        select(WishlistItem).where(
            WishlistItem.id == item_id,
            WishlistItem.user_id == current_user.id
        )
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise NotFoundException("Wishlist item")
    
    await session.delete(item)
    await session.commit()


@router.post("/{item_id}/move-to-cart", status_code=200)
async def move_to_cart(
    item_id: UUID,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Move wishlist item to cart."""
    from app.services.cart_service import CartService
    
    result = await session.execute(
        select(WishlistItem).where(
            WishlistItem.id == item_id,
            WishlistItem.user_id == current_user.id
        )
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise NotFoundException("Wishlist item")
    
    # Add to cart
    cart_service = CartService(session)
    await cart_service.add_to_cart(current_user.id, item.product_id, 1)
    
    # Remove from wishlist
    await session.delete(item)
    await session.commit()
    
    return {"message": "Moved to cart"}
