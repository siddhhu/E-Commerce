"""
Product Model
"""
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel, Column, JSON

if TYPE_CHECKING:
    from app.models.brand import Brand
    from app.models.cart import CartItem
    from app.models.category import Category
    from app.models.wishlist import WishlistItem


class ProductBase(SQLModel):
    """Product base fields."""
    name: str = Field(max_length=255)
    slug: str = Field(unique=True, index=True, max_length=255)
    sku: str = Field(unique=True, index=True, max_length=100)
    description: Optional[str] = Field(default=None)
    short_description: Optional[str] = Field(default=None)
    mrp: Decimal = Field(max_digits=10, decimal_places=2)
    selling_price: Decimal = Field(max_digits=10, decimal_places=2)
    b2b_price: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)
    stock_quantity: int = Field(default=0)
    min_order_quantity: int = Field(default=1)
    unit: str = Field(default="pcs", max_length=50)
    is_active: bool = Field(default=True)
    is_featured: bool = Field(default=False)


class Product(ProductBase, table=True):
    """Product database model."""
    __tablename__ = "products"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    category_id: Optional[UUID] = Field(default=None, foreign_key="categories.id")
    brand_id: Optional[UUID] = Field(default=None, foreign_key="brands.id")
    attributes: dict = Field(default={}, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    category: Optional["Category"] = Relationship(back_populates="products")
    brand: Optional["Brand"] = Relationship(back_populates="products")
    images: list["ProductImage"] = Relationship(back_populates="product")
    cart_items: list["CartItem"] = Relationship(back_populates="product")
    wishlist_items: list["WishlistItem"] = Relationship(back_populates="product")


class ProductImageBase(SQLModel):
    """Product image base fields."""
    image_url: str = Field(max_length=500)
    alt_text: Optional[str] = Field(default=None, max_length=255)
    sort_order: int = Field(default=0)
    is_primary: bool = Field(default=False)


class ProductImage(ProductImageBase, table=True):
    """Product image database model."""
    __tablename__ = "product_images"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    product_id: UUID = Field(foreign_key="products.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    product: "Product" = Relationship(back_populates="images")


class ProductCreate(SQLModel):
    """Schema for creating product."""
    name: str
    slug: str
    sku: str
    description: Optional[str] = None
    short_description: Optional[str] = None
    mrp: Decimal
    selling_price: Decimal
    b2b_price: Optional[Decimal] = None
    stock_quantity: int = 0
    min_order_quantity: int = 1
    category_id: Optional[UUID] = None
    brand_id: Optional[UUID] = None
    unit: str = "pcs"
    attributes: dict = {}
    is_featured: bool = False


class ProductUpdate(SQLModel):
    """Schema for updating product."""
    name: Optional[str] = None
    slug: Optional[str] = None
    sku: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    mrp: Optional[Decimal] = None
    selling_price: Optional[Decimal] = None
    b2b_price: Optional[Decimal] = None
    stock_quantity: Optional[int] = None
    min_order_quantity: Optional[int] = None
    category_id: Optional[UUID] = None
    brand_id: Optional[UUID] = None
    unit: Optional[str] = None
    attributes: Optional[dict] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None


class ProductImageRead(ProductImageBase):
    """Schema for reading product image."""
    id: UUID
    product_id: UUID


class ProductRead(ProductBase):
    """Schema for reading product."""
    id: UUID
    category_id: Optional[UUID]
    brand_id: Optional[UUID]
    attributes: dict
    created_at: datetime
    updated_at: datetime
    images: list[ProductImageRead] = []


class ProductListRead(SQLModel):
    """Schema for product listing (lighter)."""
    id: UUID
    name: str
    slug: str
    sku: str
    short_description: Optional[str]
    mrp: Decimal
    selling_price: Decimal
    b2b_price: Optional[Decimal]
    stock_quantity: int
    is_featured: bool
    primary_image: Optional[str] = None
