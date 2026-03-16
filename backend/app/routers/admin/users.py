"""
Admin Users Router
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.dependencies import get_current_admin, get_current_super_admin
from app.database import get_session
from app.models.user import User, UserRead, UserRole
from app.services.user_service import UserService

router = APIRouter()


class PaginatedUsersAdmin(BaseModel):
    """Paginated users for admin."""
    items: list[UserRead]
    total: int
    page: int
    page_size: int


class SetUserRole(BaseModel):
    """Set user role request."""
    role: UserRole


@router.get("", response_model=PaginatedUsersAdmin)
async def list_users_admin(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """List all users (admin)."""
    user_service = UserService(session)
    
    skip = (page - 1) * page_size
    
    users = await user_service.list_users(
        skip=skip,
        limit=page_size,
        role=role,
        is_active=is_active
    )
    
    total = await user_service.count_users(
        role=role,
        is_active=is_active
    )
    
    return PaginatedUsersAdmin(
        items=[UserRead.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{user_id}", response_model=UserRead)
async def get_user_admin(
    user_id: UUID,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """Get user details (admin)."""
    user_service = UserService(session)
    return await user_service.get_user_by_id(user_id)


@router.patch("/{user_id}/role", response_model=UserRead)
async def set_user_role(
    user_id: UUID,
    data: SetUserRole,
    current_user: User = Depends(get_current_super_admin),
    session: AsyncSession = Depends(get_session)
):
    """Set user role (super admin only)."""
    user_service = UserService(session)
    return await user_service.set_user_role(user_id, data.role)


@router.post("/{user_id}/deactivate", response_model=UserRead)
async def deactivate_user(
    user_id: UUID,
    current_user: User = Depends(get_current_super_admin),
    session: AsyncSession = Depends(get_session)
):
    """Deactivate a user (super admin only)."""
    user_service = UserService(session)
    return await user_service.deactivate_user(user_id)


@router.post("/{user_id}/reactivate", response_model=UserRead)
async def reactivate_user(
    user_id: UUID,
    current_user: User = Depends(get_current_super_admin),
    session: AsyncSession = Depends(get_session)
):
    """Reactivate a user (super admin only)."""
    user_service = UserService(session)
    return await user_service.reactivate_user(user_id)
