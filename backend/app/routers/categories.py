"""
Categories Router - Public category endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import get_session
from app.models.category import Category, CategoryRead, CategoryWithChildren
from app.core.exceptions import NotFoundException

router = APIRouter()


@router.get("", response_model=list[CategoryRead])
async def list_categories(
    session: AsyncSession = Depends(get_session)
):
    """List all active categories."""
    result = await session.execute(
        select(Category)
        .where(Category.is_active == True)
        .order_by(Category.sort_order, Category.name)
    )
    return result.scalars().all()


@router.get("/tree", response_model=list[CategoryWithChildren])
async def get_category_tree(
    session: AsyncSession = Depends(get_session)
):
    """Get category tree (hierarchical)."""
    # Get root categories (no parent)
    result = await session.execute(
        select(Category)
        .where(
            Category.is_active == True,
            Category.parent_id == None
        )
        .order_by(Category.sort_order, Category.name)
    )
    root_categories = result.scalars().all()
    
    # Build tree
    tree = []
    for category in root_categories:
        # Get children
        children_result = await session.execute(
            select(Category)
            .where(
                Category.is_active == True,
                Category.parent_id == category.id
            )
            .order_by(Category.sort_order, Category.name)
        )
        children = children_result.scalars().all()
        
        tree.append(CategoryWithChildren(
            id=category.id,
            name=category.name,
            slug=category.slug,
            description=category.description,
            image_url=category.image_url,
            sort_order=category.sort_order,
            is_active=category.is_active,
            parent_id=category.parent_id,
            created_at=category.created_at,
            children=[CategoryRead.model_validate(c) for c in children]
        ))
    
    return tree


@router.get("/{slug}", response_model=CategoryWithChildren)
async def get_category_by_slug(
    slug: str,
    session: AsyncSession = Depends(get_session)
):
    """Get category by slug with children."""
    result = await session.execute(
        select(Category).where(
            Category.slug == slug,
            Category.is_active == True
        )
    )
    category = result.scalar_one_or_none()
    
    if not category:
        raise NotFoundException("Category")
    
    # Get children
    children_result = await session.execute(
        select(Category)
        .where(
            Category.is_active == True,
            Category.parent_id == category.id
        )
        .order_by(Category.sort_order, Category.name)
    )
    children = children_result.scalars().all()
    
    return CategoryWithChildren(
        id=category.id,
        name=category.name,
        slug=category.slug,
        description=category.description,
        image_url=category.image_url,
        sort_order=category.sort_order,
        is_active=category.is_active,
        parent_id=category.parent_id,
        created_at=category.created_at,
        children=[CategoryRead.model_validate(c) for c in children]
    )
