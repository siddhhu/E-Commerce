"""
Banner Model
"""
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class BannerBase(SQLModel):
    """Banner base fields."""
    title: str = Field(max_length=255)
    image_url: str = Field(max_length=500)
    link_url: Optional[str] = Field(default=None, max_length=500)
    is_active: bool = Field(default=True)
    sort_order: int = Field(default=0)


class Banner(BannerBase, table=True):
    """Banner database model."""
    __tablename__ = "banners"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class BannerCreate(BannerBase):
    """Schema for creating banner."""
    pass


class BannerUpdate(SQLModel):
    """Schema for updating banner."""
    title: Optional[str] = None
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class BannerRead(BannerBase):
    """Schema for reading banner."""
    id: UUID
    created_at: datetime
    updated_at: datetime
