"""
Categories Router - Public category endpoints
"""
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.cache import response_cache
from app.database import get_session
from app.models.category import Category, CategoryRead, CategoryWithChildren
from app.models.product import Product
from app.core.exceptions import NotFoundException

router = APIRouter()


async def _category_product_image_map(session: AsyncSession, categories: list[Category]) -> dict:
    """Use first active product image as a category image when no category image is set."""
    category_ids = {cat.id for cat in categories if not cat.image_url}
    image_map: dict = {}
    if not category_ids:
        return image_map

    direct_result = await session.execute(
        select(Product.category_id, Product.image_url)
        .where(Product.is_active == True)
        .where(Product.image_url.is_not(None))
        .where(Product.category_id.in_(category_ids))
        .order_by(Product.is_featured.desc(), Product.created_at.desc())
    )
    for row in direct_result.all():
        if row.category_id and row.category_id not in image_map and row.image_url:
            image_map[row.category_id] = row.image_url

    remaining_ids = category_ids - set(image_map)
    if not remaining_ids:
        return image_map

    result = await session.execute(
        select(Product.category_ids, Product.image_url)
        .where(Product.is_active == True)
        .where(Product.image_url.is_not(None))
        .order_by(Product.is_featured.desc(), Product.created_at.desc())
        .limit(300)
    )
    rows = result.all()

    for row in rows:
        for raw_id in row.category_ids or []:
            try:
                category_id = UUID(str(raw_id))
            except (TypeError, ValueError):
                continue

            if category_id in remaining_ids and category_id not in image_map and row.image_url:
                image_map[category_id] = row.image_url

    return image_map


def _read_category(category: Category, fallback_images: dict | None = None) -> CategoryRead:
    data = CategoryRead.model_validate(category)
    if not data.image_url and fallback_images:
        data.image_url = fallback_images.get(category.id)
    return data


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
    cache_key = ("categories_list",)
    cached = response_cache.get(cache_key)
    if cached is not None:
        return JSONResponse(
            content=cached,
            headers={"Cache-Control": "public, max-age=300, stale-while-revalidate=60"},
        )

    result = await session.execute(
        select(Category)
        .where(Category.is_active == True)
        .order_by(Category.sort_order, Category.name)
    )
    categories = result.scalars().all()
    fallback_images = await _category_product_image_map(session, categories)
    data = [_read_category(c, fallback_images) for c in categories]

    content = [c.model_dump(mode="json") for c in data]
    response_cache.set(cache_key, content, ttl_seconds=300)
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
    cache_key = ("categories_tree",)
    cached = response_cache.get(cache_key)
    if cached is not None:
        return JSONResponse(
            content=cached,
            headers={"Cache-Control": "public, max-age=300, stale-while-revalidate=60"},
        )

    result = await session.execute(
        select(Category)
        .where(Category.is_active == True)
        .order_by(Category.sort_order, Category.name)
    )
    all_categories = result.scalars().all()
    fallback_images = await _category_product_image_map(session, all_categories)
    for category in all_categories:
        if not category.image_url:
            category.image_url = fallback_images.get(category.id)
    tree = _build_tree(all_categories)

    content = [t.model_dump(mode="json") for t in tree]
    response_cache.set(cache_key, content, ttl_seconds=300)
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
    cache_key = ("categories_slug", slug)
    cached = response_cache.get(cache_key)
    if cached is not None:
        return JSONResponse(
            content=cached,
            headers={"Cache-Control": "public, max-age=300, stale-while-revalidate=60"},
        )

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
    fallback_images = await _category_product_image_map(session, [category, *children])

    data = CategoryWithChildren(
        id=category.id,
        name=category.name,
        slug=category.slug,
        description=category.description,
        image_url=category.image_url or fallback_images.get(category.id),
        sort_order=category.sort_order,
        is_active=category.is_active,
        parent_id=category.parent_id,
        created_at=category.created_at,
        children=[_read_category(c, fallback_images) for c in children],
    )
    content = data.model_dump(mode="json")
    response_cache.set(cache_key, content, ttl_seconds=300)
    return JSONResponse(
        content=content,
        headers={"Cache-Control": "public, max-age=300, stale-while-revalidate=60"},
    )
