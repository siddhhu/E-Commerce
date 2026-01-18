"""
User Service - User profile management
"""
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.exceptions import NotFoundException
from app.models.user import User, UserRole, UserUpdate


class UserService:
    """Service for user operations."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_user_by_id(self, user_id: UUID) -> User:
        """Get user by ID or raise exception."""
        result = await self.session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise NotFoundException("User")
        
        return user
    
    async def update_user(self, user_id: UUID, data: UserUpdate) -> User:
        """Update user profile."""
        user = await self.get_user_by_id(user_id)
        
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
        
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        
        return user
    
    async def list_users(
        self,
        skip: int = 0,
        limit: int = 20,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None
    ) -> list[User]:
        """List users with optional filters."""
        query = select(User)
        
        if role:
            query = query.where(User.role == role)
        if is_active is not None:
            query = query.where(User.is_active == is_active)
        
        query = query.offset(skip).limit(limit).order_by(User.created_at.desc())
        
        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def count_users(
        self,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None
    ) -> int:
        """Count users with optional filters."""
        from sqlalchemy import func
        
        query = select(func.count(User.id))
        
        if role:
            query = query.where(User.role == role)
        if is_active is not None:
            query = query.where(User.is_active == is_active)
        
        result = await self.session.execute(query)
        return result.scalar() or 0
    
    async def set_user_role(self, user_id: UUID, role: UserRole) -> User:
        """Set user role (admin only)."""
        user = await self.get_user_by_id(user_id)
        user.role = role
        
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        
        return user
    
    async def deactivate_user(self, user_id: UUID) -> User:
        """Deactivate a user account."""
        user = await self.get_user_by_id(user_id)
        user.is_active = False
        
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        
        return user
    
    async def reactivate_user(self, user_id: UUID) -> User:
        """Reactivate a user account."""
        user = await self.get_user_by_id(user_id)
        user.is_active = True
        
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        
        return user
