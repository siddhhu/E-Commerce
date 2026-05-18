"""
Admin Users Router
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.dependencies import get_current_admin, get_current_super_admin
from app.database import get_session
from app.models.user import User, UserRead, UserRole, SellerCredentialsRead
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


@router.post("/{user_id}/verify", response_model=UserRead)
async def verify_user(
    user_id: UUID,
    is_verified: bool = Query(True),
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """Verify/Approve a user (B2B)."""
    user_service = UserService(session)
    return await user_service.verify_user(user_id, is_verified)


# ── Seller Application Management (Super Admin only) ─────────────────────────

@router.get("/sellers/pending", response_model=list[UserRead])
async def list_pending_sellers(
    current_user: User = Depends(get_current_super_admin),
    session: AsyncSession = Depends(get_session)
):
    """
    List all sellers whose applications are pending approval.
    Super admin only.
    """
    user_service = UserService(session)
    return await user_service.list_pending_sellers()


@router.post("/{user_id}/approve-seller", response_model=SellerCredentialsRead)
async def approve_seller(
    user_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_super_admin),
    session: AsyncSession = Depends(get_session)
):
    """
    Approve a seller application (super admin only).
    Generates a @pranjay.com username and a random password.
    Returns the plain credentials — admin must share these with the seller manually.
    If the seller provided a contact_email, credentials are also emailed to them.
    """
    from app.services.email_service import email_service

    user_service = UserService(session)
    user, plain_password = await user_service.approve_seller(user_id)

    # Send credentials email if seller has a contact email
    notify_email = user.contact_email or user.email
    # Only send if contact_email is set (email field may be phone-generated)
    if user.contact_email:
        background_tasks.add_task(
            email_service.send_seller_approved_credentials,
            user.contact_email,
            user.full_name or user.business_name or "Seller",
            user.seller_username,
            plain_password
        )

    return SellerCredentialsRead(
        id=user.id,
        seller_username=user.seller_username,
        seller_plain_password=plain_password,
        seller_status=user.seller_status,
        business_name=user.business_name,
        full_name=user.full_name
    )


@router.post("/{user_id}/reject-seller", response_model=UserRead)
async def reject_seller(
    user_id: UUID,
    current_user: User = Depends(get_current_super_admin),
    session: AsyncSession = Depends(get_session)
):
    """
    Reject a seller application (super admin only).
    """
    user_service = UserService(session)
    return await user_service.reject_seller(user_id)
