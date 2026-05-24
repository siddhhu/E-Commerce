"""
Categories Router - Public category endpoints
"""
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import get_session
from app.models.category import Category, CategoryRead, CategoryWithChildren
from app.core.exceptions import NotFoundException

router = APIRouter()


def _build_tree(categories: list[Category]) -> list[CategoryWithChildren]:
    """Build category tree in Python from a flat list — O(N), no N+1."""
    id_map: dict = {}
    roots: list[CategoryWithChildren] = []

    # First pass: create all nodes
    for cat in categories:
        id_map[cat.id] = CategoryWithChildren(
            id=cat.id,
            name=cat.name,
            slug=cat.slug,
            description=cat.description,
            image_url=cat.image_url,
            sort_order=cat.sort_order,
            is_active=cat.is_active,
            parent_id=cat.parent_id,
            created_at=cat.created_at,
            children=[],
        )

    # Second pass: attach children to parents
    for cat in categories:
        node = id_map[cat.id]
        if cat.parent_id and cat.parent_id in id_map:
            id_map[cat.parent_id].children.append(node)
        else:
            roots.append(node)

    return roots


@router.get("", response_model=list[CategoryRead])
async def list_categories(
    session: AsyncSession = Depends(get_session)
):
    """List all active categories. Cached for 5 minutes."""
    result = await session.execute(
        select(Category)
        .where(Category.is_active == True)
        .order_by(Category.sort_order, Category.name)
    )
    categories = result.scalars().all()
    data = [CategoryRead.model_validate(c) for c in categories]

    from fastapi.responses import Response
    import json
    content = [c.model_dump(mode="json") for c in data]
    return JSONResponse(
        content=content,
        headers={"Cache-Control": "public, max-age=300, stale-while-revalidate=60"},
    )


@router.get("/tree", response_model=list[CategoryWithChildren])
async def get_category_tree(
    session: AsyncSession = Depends(get_session)
):
    """
    Get full category tree in ONE query (was N+1).
    Builds parent→children mapping in Python. Cached 5 min.
    """
    result = await session.execute(
        select(Category)
        .where(Category.is_active == True)
        .order_by(Category.sort_order, Category.name)
    )
    all_categories = result.scalars().all()
    tree = _build_tree(all_categories)

    content = [t.model_dump(mode="json") for t in tree]
    return JSONResponse(
        content=content,
        headers={"Cache-Control": "public, max-age=300, stale-while-revalidate=60"},
    )


@router.get("/{slug}", response_model=CategoryWithChildren)
async def get_category_by_slug(
    slug: str,
    session: AsyncSession = Depends(get_session)
):
    """Get category by slug with children — 2 queries (parent + children)."""
    # Fetch all categories once and filter — avoids extra round-trip
    result = await session.execute(
        select(Category)
        .where(Category.is_active == True)
        .order_by(Category.sort_order, Category.name)
    )
    all_cats = result.scalars().all()
    category = next((c for c in all_cats if c.slug == slug), None)

    if not category:
        raise NotFoundException("Category")

    children = [c for c in all_cats if c.parent_id == category.id]

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
        children=[CategoryRead.model_validate(c) for c in children],
    )

