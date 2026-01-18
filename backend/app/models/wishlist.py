"""
Wishlist Model
"""
from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel, UniqueConstraint

if TYPE_CHECKING:
    from app.models.product import Product
    from app.models.user import User


class WishlistItem(SQLModel, table=True):
    """Wishlist item database model."""
    __tablename__ = "wishlist_items"
    __table_args__ = (UniqueConstraint("user_id", "product_id"),)
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    product_id: UUID = Field(foreign_key="products.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: "User" = Relationship(back_populates="wishlist_items")
    product: "Product" = Relationship(back_populates="wishlist_items")


class WishlistItemCreate(SQLModel):
    """Schema for creating wishlist item."""
    product_id: UUID


class WishlistItemRead(SQLModel):
    """Schema for reading wishlist item."""
    id: UUID
    user_id: UUID
    product_id: UUID
    created_at: datetime


class WishlistItemWithProduct(WishlistItemRead):
    """Schema for wishlist item with product details."""
    product_name: str
    product_slug: str
    product_sku: str
    selling_price: float
    mrp: float
    primary_image: str | None = None
    is_in_stock: bool
