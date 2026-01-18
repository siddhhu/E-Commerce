"""
User Model
"""
import enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.address import Address
    from app.models.cart import CartItem
    from app.models.order import Order
    from app.models.otp import OTPCode
    from app.models.wishlist import WishlistItem


class UserType(str, enum.Enum):
    """User type enum."""
    B2B = "B2B"
    B2C = "B2C"


class UserRole(str, enum.Enum):
    """User role enum."""
    CUSTOMER = "customer"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"


class UserBase(SQLModel):
    """User base fields."""
    email: str = Field(unique=True, index=True, max_length=255)
    phone: Optional[str] = Field(default=None, max_length=20)
    full_name: Optional[str] = Field(default=None, max_length=255)
    business_name: Optional[str] = Field(default=None, max_length=255)
    gst_number: Optional[str] = Field(default=None, max_length=15)
    user_type: UserType = Field(default=UserType.B2B)
    role: UserRole = Field(default=UserRole.CUSTOMER)
    is_active: bool = Field(default=True)
    is_verified: bool = Field(default=False)


class User(UserBase, table=True):
    """User database model."""
    __tablename__ = "users"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    addresses: list["Address"] = Relationship(back_populates="user")
    cart_items: list["CartItem"] = Relationship(back_populates="user")
    wishlist_items: list["WishlistItem"] = Relationship(back_populates="user")
    orders: list["Order"] = Relationship(back_populates="user")
    otp_codes: list["OTPCode"] = Relationship(back_populates="user")


class UserCreate(SQLModel):
    """Schema for creating user."""
    email: str
    phone: Optional[str] = None
    full_name: Optional[str] = None
    business_name: Optional[str] = None
    gst_number: Optional[str] = None
    user_type: UserType = UserType.B2B


class UserUpdate(SQLModel):
    """Schema for updating user."""
    phone: Optional[str] = None
    full_name: Optional[str] = None
    business_name: Optional[str] = None
    gst_number: Optional[str] = None
    user_type: Optional[UserType] = None


class UserRead(UserBase):
    """Schema for reading user."""
    id: UUID
    created_at: datetime
    updated_at: datetime
