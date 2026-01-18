"""
OTP Code Model
"""
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.user import User


class OTPCodeBase(SQLModel):
    """OTP base fields."""
    email: str = Field(index=True, max_length=255)
    otp_hash: str = Field(max_length=255)
    expires_at: datetime
    is_used: bool = Field(default=False)


class OTPCode(OTPCodeBase, table=True):
    """OTP database model."""
    __tablename__ = "otp_codes"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: Optional[UUID] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: Optional["User"] = Relationship(back_populates="otp_codes")


class OTPRequest(SQLModel):
    """Schema for requesting OTP."""
    email: str


class OTPVerify(SQLModel):
    """Schema for verifying OTP."""
    email: str
    otp: str
