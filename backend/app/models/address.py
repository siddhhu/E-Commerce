"""
Address Model
"""
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.user import User


class AddressBase(SQLModel):
    """Address base fields."""
    label: str = Field(default="home", max_length=50)
    full_name: str = Field(max_length=255)
    phone: str = Field(max_length=20)
    address_line1: str = Field(max_length=500)
    address_line2: Optional[str] = Field(default=None, max_length=500)
    city: str = Field(max_length=100)
    state: str = Field(max_length=100)
    postal_code: str = Field(max_length=20)
    country: str = Field(default="India", max_length=100)
    is_default: bool = Field(default=False)


class Address(AddressBase, table=True):
    """Address database model."""
    __tablename__ = "addresses"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: "User" = Relationship(back_populates="addresses")


class AddressCreate(SQLModel):
    """Schema for creating address."""
    label: str = "home"
    full_name: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str = "India"
    is_default: bool = False


class AddressUpdate(SQLModel):
    """Schema for updating address."""
    label: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    is_default: Optional[bool] = None


class AddressRead(AddressBase):
    """Schema for reading address."""
    id: UUID
    user_id: UUID
    created_at: datetime
