"""
Category Model
"""
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.product import Product


class CategoryBase(SQLModel):
    """Category base fields."""
    name: str = Field(max_length=255)
    slug: str = Field(unique=True, index=True, max_length=255)
    description: Optional[str] = Field(default=None)
    image_url: Optional[str] = Field(default=None, max_length=500)
    sort_order: int = Field(default=0)
    is_active: bool = Field(default=True)


class Category(CategoryBase, table=True):
    """Category database model."""
    __tablename__ = "categories"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    parent_id: Optional[UUID] = Field(default=None, foreign_key="categories.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Self-referential relationship for hierarchy
    parent: Optional["Category"] = Relationship(
        back_populates="children",
        sa_relationship_kwargs={"remote_side": "Category.id"}
    )
    children: list["Category"] = Relationship(back_populates="parent")
    products: list["Product"] = Relationship(back_populates="category")


class CategoryCreate(SQLModel):
    """Schema for creating category."""
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    parent_id: Optional[UUID] = None
    sort_order: int = 0


class CategoryUpdate(SQLModel):
    """Schema for updating category."""
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    parent_id: Optional[UUID] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class CategoryRead(CategoryBase):
    """Schema for reading category."""
    id: UUID
    parent_id: Optional[UUID]
    created_at: datetime


class CategoryWithChildren(CategoryRead):
    """Schema for category with children."""
    children: list["CategoryRead"] = []
