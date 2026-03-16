"""
Users Router - User profile endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_active_user
from app.database import get_session
from app.models.user import User, UserRead, UserUpdate
from app.models.address import Address, AddressCreate, AddressRead, AddressUpdate
from app.services.user_service import UserService

router = APIRouter()


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
    """Update current user's profile."""
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
