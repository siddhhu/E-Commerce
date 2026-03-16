"""
Brand Model
"""
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.product import Product


class BrandBase(SQLModel):
    """Brand base fields."""
    name: str = Field(unique=True, max_length=255)
    slug: str = Field(unique=True, index=True, max_length=255)
    logo_url: Optional[str] = Field(default=None, max_length=500)
    description: Optional[str] = Field(default=None)
    is_active: bool = Field(default=True)


class Brand(BrandBase, table=True):
    """Brand database model."""
    __tablename__ = "brands"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    products: list["Product"] = Relationship(back_populates="brand")


class BrandCreate(SQLModel):
    """Schema for creating brand."""
    name: str
    slug: str
    logo_url: Optional[str] = None
    description: Optional[str] = None


class BrandUpdate(SQLModel):
    """Schema for updating brand."""
    name: Optional[str] = None
    slug: Optional[str] = None
    logo_url: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class BrandRead(BrandBase):
    """Schema for reading brand."""
    id: UUID
    created_at: datetime
