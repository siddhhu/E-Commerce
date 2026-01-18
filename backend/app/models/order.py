"""
Order Model
"""
import enum
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional
from uuid import UUID, uuid4

from sqlmodel import Column, Field, JSON, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.address import Address
    from app.models.product import Product
    from app.models.user import User


class OrderStatus(str, enum.Enum):
    """Order status enum."""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class PaymentStatus(str, enum.Enum):
    """Payment status enum."""
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"


class OrderBase(SQLModel):
    """Order base fields."""
    order_number: str = Field(unique=True, index=True, max_length=50)
    status: OrderStatus = Field(default=OrderStatus.PENDING)
    payment_status: PaymentStatus = Field(default=PaymentStatus.PENDING)
    payment_method: Optional[str] = Field(default=None, max_length=50)
    subtotal: Decimal = Field(max_digits=12, decimal_places=2)
    discount_amount: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=2)
    shipping_amount: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=2)
    tax_amount: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=2)
    total_amount: Decimal = Field(max_digits=12, decimal_places=2)
    notes: Optional[str] = Field(default=None)


class Order(OrderBase, table=True):
    """Order database model."""
    __tablename__ = "orders"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: Optional[UUID] = Field(default=None, foreign_key="users.id", index=True)
    shipping_address_id: Optional[UUID] = Field(default=None, foreign_key="addresses.id")
    order_metadata: dict = Field(default={}, sa_column=Column(JSON))
    placed_at: Optional[datetime] = Field(default=None)
    shipped_at: Optional[datetime] = Field(default=None)
    delivered_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: Optional["User"] = Relationship(back_populates="orders")
    items: list["OrderItem"] = Relationship(back_populates="order")


class OrderItemBase(SQLModel):
    """Order item base fields."""
    product_name: str = Field(max_length=255)
    product_sku: str = Field(max_length=100)
    unit_price: Decimal = Field(max_digits=10, decimal_places=2)
    quantity: int
    total_price: Decimal = Field(max_digits=12, decimal_places=2)


class OrderItem(OrderItemBase, table=True):
    """Order item database model."""
    __tablename__ = "order_items"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    order_id: UUID = Field(foreign_key="orders.id")
    product_id: Optional[UUID] = Field(default=None, foreign_key="products.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    order: "Order" = Relationship(back_populates="items")


class OrderItemCreate(SQLModel):
    """Schema for creating order item."""
    product_id: UUID
    quantity: int


class OrderItemRead(OrderItemBase):
    """Schema for reading order item."""
    id: UUID
    order_id: UUID
    product_id: Optional[UUID]


class OrderCreate(SQLModel):
    """Schema for creating order."""
    shipping_address_id: UUID
    payment_method: str
    notes: Optional[str] = None
    items: list[OrderItemCreate]


class OrderUpdate(SQLModel):
    """Schema for updating order."""
    status: Optional[OrderStatus] = None
    payment_status: Optional[PaymentStatus] = None
    notes: Optional[str] = None


class OrderRead(OrderBase):
    """Schema for reading order."""
    id: UUID
    user_id: Optional[UUID]
    shipping_address_id: Optional[UUID]
    placed_at: Optional[datetime]
    shipped_at: Optional[datetime]
    delivered_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemRead] = []


class OrderListRead(SQLModel):
    """Schema for order listing (lighter)."""
    id: UUID
    order_number: str
    status: OrderStatus
    payment_status: PaymentStatus
    total_amount: Decimal
    items_count: int
    placed_at: Optional[datetime]
    created_at: datetime
