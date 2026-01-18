"""
Auth Service - Authentication business logic
"""
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.security import create_access_token, create_refresh_token, verify_refresh_token
from app.core.exceptions import UnauthorizedException
from app.models.user import User, UserCreate


class AuthService:
    """Service for authentication operations."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        result = await self.session.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()
    
    async def get_user_by_id(self, user_id: UUID) -> Optional[User]:
        """Get user by ID."""
        result = await self.session.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()
    
    async def get_or_create_user(self, email: str) -> tuple[User, bool]:
        """
        Get existing user or create new one.
        Returns (user, is_new).
        """
        user = await self.get_user_by_email(email)
        
        if user:
            return user, False
        
        # Create new user
        new_user = User(email=email)
        self.session.add(new_user)
        await self.session.commit()
        await self.session.refresh(new_user)
        
        return new_user, True
    
    async def mark_user_verified(self, user: User) -> User:
        """Mark user as verified after successful OTP verification."""
        user.is_verified = True
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user
    
    def generate_tokens(self, user: User) -> dict:
        """Generate access and refresh tokens for user."""
        token_data = {"sub": str(user.id), "email": user.email}
        
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    
    async def refresh_tokens(self, refresh_token: str) -> dict:
        """Generate new tokens using refresh token."""
        payload = verify_refresh_token(refresh_token)
        
        if not payload:
            raise UnauthorizedException("Invalid refresh token")
        
        user_id = payload.get("sub")
        if not user_id:
            raise UnauthorizedException("Invalid token payload")
        
        user = await self.get_user_by_id(UUID(user_id))
        if not user:
            raise UnauthorizedException("User not found")
        
        if not user.is_active:
            raise UnauthorizedException("User account is deactivated")
        
        return self.generate_tokens(user)
