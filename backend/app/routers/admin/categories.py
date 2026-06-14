from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func

from app.core.cache import response_cache
from app.database import get_session
from app.models.category import Category, CategoryCreate, CategoryUpdate, CategoryRead
from app.models.user import User, UserRole
from app.core.dependencies import get_current_admin
from app.core.exceptions import ConflictException, NotFoundException

router = APIRouter()

@router.get("", response_model=list[CategoryRead])
async def list_categories_admin(
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """List all categories (admin view)."""
    result = await session.execute(
        select(Category).order_by(Category.sort_order, Category.name)
    )
    return result.scalars().all()

@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: CategoryCreate,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """Create a new category."""
    # Check if slug exists
    existing = await session.execute(select(Category).where(Category.slug == data.slug))
    if existing.scalar_one_or_none():
        raise ConflictException("Category with this slug already exists")
    
    # Seller attribution
    is_admin = current_user.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]
    data.seller_id = None if is_admin else current_user.id
    data.seller_name = "Pranjay" if is_admin else (current_user.business_name or current_user.full_name or "Seller")
    
    category = Category(**data.model_dump())
    session.add(category)
    await session.commit()
    await session.refresh(category)
    response_cache.clear_prefix("categories_list")
    response_cache.clear_prefix("categories_tree")
    response_cache.clear_prefix("categories_slug")
    return category

@router.patch("/{category_id}", response_model=CategoryRead)
async def update_category(
    category_id: UUID,
    data: CategoryUpdate,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """Update a category."""
    result = await session.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    
    if not category:
        raise NotFoundException("Category")
    
    if data.slug is not None and data.slug != category.slug:
        existing = await session.execute(select(Category).where(Category.slug == data.slug))
        if existing.scalar_one_or_none():
            raise ConflictException("Category with this slug already exists")
            
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)
        
    session.add(category)
    await session.commit()
    await session.refresh(category)
    response_cache.clear_prefix("categories_list")
    response_cache.clear_prefix("categories_tree")
    response_cache.clear_prefix("categories_slug")
    return category

@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: UUID,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """Delete a category."""
    result = await session.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    
    if not category:
        raise NotFoundException("Category")
        
    await session.delete(category)
    await session.commit()
    response_cache.clear_prefix("categories_list")
    response_cache.clear_prefix("categories_tree")
    response_cache.clear_prefix("categories_slug")
