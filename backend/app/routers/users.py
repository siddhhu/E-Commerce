"""
Users Router - User profile endpoints
"""
import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel as _PydanticModel

from app.core.dependencies import get_current_active_user
from app.core.security import verify_password, hash_password
from app.database import get_session
from app.models.user import User, UserRead, UserUpdate
from app.models.address import Address, AddressCreate, AddressRead, AddressUpdate
from app.services.user_service import UserService

router = APIRouter()

# Indian GST format: 2 digits (state) + 5 alpha (PAN prefix) + 4 digits + 1 alpha + 1 alphanum + Z + 1 alphanum
_GST_RE = re.compile(r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$')


# ── Change Password ───────────────────────────────────────────────────────────

class ChangePasswordRequest(_PydanticModel):
    """Change password request."""
    current_password: str
    new_password: str


@router.post("/me/change-password", status_code=200)
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Change the current user's password.
    Requires the correct current password. Works for admin, seller, and customer.
    """
    # Validate current password
    if not current_user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account uses phone/OTP login and does not have a password set."
        )

    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )

    # Validate new password strength
    if len(data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="New password must be at least 8 characters long."
        )

    if data.new_password == data.current_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from the current password."
        )

    # Hash and save
    current_user.hashed_password = hash_password(data.new_password)
    session.add(current_user)
    await session.commit()

    return {"message": "Password updated successfully."}



@router.get("/me", response_model=UserRead)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's profile."""
    return current_user


@router.patch("/me", response_model=UserRead)
async def update_current_user_profile(
    data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Update current user's profile. GST number is mandatory for sellers."""
    # Server-side GST validation for sellers
    if data.user_type == "seller" or (data.user_type is None and current_user.user_type == "seller"):
        if data.contact_email is not None:
            contact_email = data.contact_email.strip()
            if not contact_email:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Seller email is required."
                )
            data.contact_email = contact_email.lower()
        elif not current_user.contact_email:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Seller email is required."
            )
        if data.gst_number is not None:
            gst = data.gst_number.strip().upper()
            if gst and not _GST_RE.match(gst):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Invalid GST number format. Must be 15 characters, e.g. 27AABCU9603R1ZV"
                )
            data.gst_number = gst or None

    user_service = UserService(session)
    updated_user = await user_service.update_user(current_user.id, data)
    return updated_user


# Address endpoints
@router.get("/me/addresses", response_model=list[AddressRead])
async def get_my_addresses(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Get current user's addresses."""
    from sqlmodel import select
    
    result = await session.execute(
        select(Address).where(Address.user_id == current_user.id)
    )
    return result.scalars().all()


@router.post("/me/addresses", response_model=AddressRead, status_code=201)
async def create_address(
    data: AddressCreate,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Create a new address."""
    from sqlmodel import select
    
    # If setting as default, unset other defaults
    if data.is_default:
        result = await session.execute(
            select(Address).where(
                Address.user_id == current_user.id,
                Address.is_default == True
            )
        )
        for addr in result.scalars():
            addr.is_default = False
            session.add(addr)
    
    address = Address(
        user_id=current_user.id,
        **data.model_dump()
    )
    
    session.add(address)
    await session.commit()
    await session.refresh(address)
    
    return address


@router.patch("/me/addresses/{address_id}", response_model=AddressRead)
async def update_address(
    address_id: str,
    data: AddressUpdate,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Update an address."""
    from uuid import UUID
    from sqlmodel import select
    from app.core.exceptions import NotFoundException
    
    result = await session.execute(
        select(Address).where(
            Address.id == UUID(address_id),
            Address.user_id == current_user.id
        )
    )
    address = result.scalar_one_or_none()
    
    if not address:
        raise NotFoundException("Address")
    
    # If setting as default, unset other defaults
    if data.is_default:
        result = await session.execute(
            select(Address).where(
                Address.user_id == current_user.id,
                Address.is_default == True,
                Address.id != address.id
            )
        )
        for addr in result.scalars():
            addr.is_default = False
            session.add(addr)
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(address, field, value)
    
    session.add(address)
    await session.commit()
    await session.refresh(address)
    
    return address


@router.delete("/me/addresses/{address_id}", status_code=204)
async def delete_address(
    address_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Delete an address."""
    from uuid import UUID
    from sqlmodel import select
    from app.core.exceptions import NotFoundException
    
    result = await session.execute(
        select(Address).where(
            Address.id == UUID(address_id),
            Address.user_id == current_user.id
        )
    )
    address = result.scalar_one_or_none()
    
    if not address:
        raise NotFoundException("Address")
    
    await session.delete(address)
    await session.commit()


# ── Seller Application ────────────────────────────────────────────────────────

from pydantic import BaseModel as _BaseModel
from fastapi import BackgroundTasks


class SellerApplicationRequest(_BaseModel):
    """Submit a seller registration application."""
    invoice_url: str    # URL of the uploaded document (already in Supabase Storage)
    bank_proof_url: str
    bank_account_holder_name: str
    bank_account_number: str
    bank_ifsc: str
    bank_name: str | None = None


@router.post("/me/seller-application", response_model=UserRead, status_code=200)
async def submit_seller_application(
    data: SellerApplicationRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Submit a seller registration application.
    - Upload your registration invoice/document first (via the storage endpoint).
    - Pass the resulting URL here.
    - Status becomes 'pending'. Admin is notified by email.
    - You will receive a confirmation email with next steps.
    """
    from app.config import settings
    from app.services.email_service import email_service

    user_service = UserService(session)
    bank_account_number = "".join(ch for ch in data.bank_account_number.strip() if ch.isdigit())
    bank_ifsc = data.bank_ifsc.strip().upper()
    if len(bank_account_number) < 9 or len(bank_account_number) > 18:
        raise BadRequestException("Bank account number must be 9 to 18 digits")
    import re
    if not re.fullmatch(r"^[A-Z]{4}0[A-Z0-9]{6}$", bank_ifsc):
        raise BadRequestException("Invalid IFSC code format")
    if not data.bank_account_holder_name.strip():
        raise BadRequestException("Bank account holder name is required")
    if not data.bank_proof_url.strip():
        raise BadRequestException("Bank proof document is required")

    user = await user_service.submit_seller_application(
        current_user.id,
        data.invoice_url,
        data.bank_proof_url.strip(),
        data.bank_account_holder_name,
        bank_account_number,
        bank_ifsc,
        data.bank_name,
    )

    # Fire notification emails in background
    # Use contact_email if set (login email is auto-generated from phone for OTP users)
    notify_to = user.contact_email or user.email
    if user.contact_email:
        background_tasks.add_task(
            email_service.send_seller_application_received,
            notify_to,
            user.business_name
        )
    background_tasks.add_task(
        email_service.send_seller_application_to_admin,
        settings.admin_email,
        user.full_name or user.email,
        user.phone or "—",
        user.business_name or "—",
        user.gst_number or "—",
        data.invoice_url,
        str(user.id)
    )

    return user
