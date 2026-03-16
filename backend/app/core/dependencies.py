"""
FastAPI Dependencies
"""
from typing import Optional
from uuid import UUID

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import verify_access_token
from app.database import get_session
from app.models.user import User, UserRole


async def get_current_user(
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session)
) -> User:
    """Get current authenticated user from JWT token."""
    if not authorization:
        raise UnauthorizedException("Missing authorization header")
    
    # Extract token from "Bearer <token>"
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise UnauthorizedException("Invalid authentication scheme")
    except ValueError:
        raise UnauthorizedException("Invalid authorization header format")
    
    # Verify token
    payload = verify_access_token(token)
    if not payload:
        raise UnauthorizedException("Invalid or expired token")
    
    # Get user ID from token
    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedException("Invalid token payload")
    
    # Fetch user from database
    result = await session.execute(
        select(User).where(User.id == UUID(user_id))
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise UnauthorizedException("User not found")
    
    if not user.is_active:
        raise ForbiddenException("User account is deactivated")
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user."""
    if not current_user.is_verified:
        raise ForbiddenException("Email not verified")
    return current_user


async def get_current_admin(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Get current admin user."""
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise ForbiddenException("Admin access required")
    return current_user


async def get_current_super_admin(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Get current super admin user."""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise ForbiddenException("Super admin access required")
    return current_user


def get_optional_user():
    """Dependency for optional authentication (e.g., public product listings)."""
    async def _get_optional_user(
        authorization: Optional[str] = Header(None),
        session: AsyncSession = Depends(get_session)
    ) -> Optional[User]:
        if not authorization:
            return None
        
        try:
            return await get_current_user(authorization, session)
        except UnauthorizedException:
            return None
    
    return _get_optional_user
