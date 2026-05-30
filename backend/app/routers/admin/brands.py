"""
Admin Brands API Router
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from app.db.session import get_session
from app.models.brand import Brand, BrandCreate, BrandUpdate, BrandRead
from app.routers.auth import get_current_admin_user

router = APIRouter(
    dependencies=[Depends(get_current_admin_user)]
)

@router.get("", response_model=List[BrandRead])
async def list_brands(
    session: AsyncSession = Depends(get_session),
    skip: int = 0,
    limit: int = 100,
):
    """Get all brands (Admin)"""
    query = select(Brand).offset(skip).limit(limit).order_by(Brand.name)
    result = await session.execute(query)
    brands = result.scalars().all()
    return brands

@router.post("", response_model=BrandRead)
async def create_brand(
    brand_in: BrandCreate,
    session: AsyncSession = Depends(get_session),
):
    """Create a new brand"""
    # Check if slug exists
    query = select(Brand).where(Brand.slug == brand_in.slug)
    result = await session.execute(query)
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Brand with this slug already exists",
        )
    
    brand = Brand.model_validate(brand_in)
    session.add(brand)
    await session.commit()
    await session.refresh(brand)
    return brand

@router.patch("/{brand_id}", response_model=BrandRead)
async def update_brand(
    brand_id: UUID,
    brand_in: BrandUpdate,
    session: AsyncSession = Depends(get_session),
):
    """Update a brand"""
    brand = await session.get(Brand, brand_id)
    if not brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand not found",
        )
    
    # Check if slug exists for another brand
    if brand_in.slug and brand_in.slug != brand.slug:
        query = select(Brand).where(Brand.slug == brand_in.slug)
        result = await session.execute(query)
        if result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Brand with this slug already exists",
            )
            
    brand_data = brand_in.model_dump(exclude_unset=True)
    for key, value in brand_data.items():
        setattr(brand, key, value)
        
    session.add(brand)
    await session.commit()
    await session.refresh(brand)
    return brand

@router.delete("/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_brand(
    brand_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    """Delete a brand"""
    brand = await session.get(Brand, brand_id)
    if not brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand not found",
        )
        
    await session.delete(brand)
    await session.commit()
