"""
Cart Model
"""
from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel, UniqueConstraint

if TYPE_CHECKING:
    from app.models.product import Product
    from app.models.user import User


class CartItemBase(SQLModel):
    """Cart item base fields."""
    quantity: int = Field(default=1, ge=1)


class CartItem(CartItemBase, table=True):
    """Cart item database model."""
    __tablename__ = "cart_items"
    __table_args__ = (UniqueConstraint("user_id", "product_id"),)
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    product_id: UUID = Field(foreign_key="products.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: "User" = Relationship(back_populates="cart_items")
    product: "Product" = Relationship(back_populates="cart_items")


class CartItemCreate(SQLModel):
    """Schema for creating cart item."""
    product_id: UUID
    quantity: int = 1


class CartItemUpdate(SQLModel):
    """Schema for updating cart item."""
    quantity: int


class CartItemRead(CartItemBase):
    """Schema for reading cart item."""
    id: UUID
    user_id: UUID
    product_id: UUID
    created_at: datetime
    updated_at: datetime


class CartItemWithProduct(CartItemRead):
    """Schema for cart item with product details."""
    product_name: str
    product_slug: str
    product_sku: str
    unit_price: float
    primary_image: str | None = None
    total_price: float
