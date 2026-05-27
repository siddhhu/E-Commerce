"""
Products Router - Public product endpoints
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_session
from app.models.product import Product, ProductListRead, ProductRead
from app.models.user import User
from app.services.product_service import ProductService
from sqlmodel import select

router = APIRouter()


class PaginatedProducts(BaseModel):
    """Paginated products response."""
    items: list[ProductListRead]
    total: int
    page: int
    page_size: int
    pages: int


def _primary_image(product: Product) -> Optional[str]:
    """Extract primary image URL from a product (shared helper)."""
    url = getattr(product, "image_url", None)
    if url:
        return url
    if product.images:
        primary = next((img for img in product.images if img.is_primary), None)
        return primary.image_url if primary else product.images[0].image_url
    return None


def _to_list_read(product: Product) -> ProductListRead:
    """Convert Product ORM model to ProductListRead (shared helper)."""
    return ProductListRead(
        id=product.id,
        name=product.name,
        slug=product.slug,
        sku=product.sku,
        short_description=product.short_description,
        mrp=product.mrp,
        selling_price=product.selling_price,
        b2b_price=product.b2b_price,
        stock_quantity=product.stock_quantity,
        is_featured=product.is_featured,
        category_id=product.category_id,
        category_ids=product.category_ids or [],
        image_url=getattr(product, "image_url", None),
        primary_image=_primary_image(product),
        seller_id=product.seller_id,
        seller_name=product.seller_name or "Pranjay",
    )


@router.get("", response_model=PaginatedProducts)
async def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category_id: Optional[UUID] = None,
    brand_id: Optional[UUID] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    is_featured: Optional[bool] = None,
    session: AsyncSession = Depends(get_session)
):
    """
    List products with filtering and pagination.
    Runs list + count queries in parallel (saves 1 Supabase round-trip per call).
    Public endpoint.
    """
    product_service = ProductService(session)
    skip = (page - 1) * page_size

    # NOTE: asyncio.gather on the same SQLAlchemy AsyncSession is ILLEGAL —
    # the session is not concurrency-safe. Run list then count sequentially.
    products = await product_service.list_products(
        skip=skip,
        limit=page_size,
        category_id=category_id,
        brand_id=brand_id,
        search=search,
        min_price=min_price,
        max_price=max_price,
        is_featured=is_featured,
        is_active=True,
    )
    total = await product_service.count_products(
        category_id=category_id,
        brand_id=brand_id,
        is_active=True,
    )

    pages = (total + page_size - 1) // page_size

    return PaginatedProducts(
        items=[_to_list_read(p) for p in products],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/featured", response_model=list[ProductListRead])
async def get_featured_products(
    limit: int = Query(10, ge=1, le=50),
    session: AsyncSession = Depends(get_session)
):
    """Get featured products. Cached for 2 minutes (public, rarely changes)."""
    product_service = ProductService(session)

    products = await product_service.list_products(
        limit=limit,
        is_featured=True,
        is_active=True,
    )

    items = [_to_list_read(p) for p in products]
    content = [i.model_dump(mode="json") for i in items]

    return JSONResponse(
        content=content,
        headers={"Cache-Control": "public, max-age=120, stale-while-revalidate=30"},
    )


@router.get("/search-index")
async def get_search_index(
    session: AsyncSession = Depends(get_session)
):
    """
    Lightweight search index: returns minimal product data for client-side
    instant search. Cached for 5 minutes. Max 500 products.
    """
    product_service = ProductService(session)
    products = await product_service.list_products(
        skip=0,
        limit=500,
        is_active=True,
    )
    items = []
    for p in products:
        items.append({
            "id": str(p.id),
            "name": p.name,
            "slug": p.slug,
            "sku": p.sku,
            "selling_price": float(p.selling_price),
            "mrp": float(p.mrp),
            "image": _primary_image(p),
            "short_description": p.short_description or "",
            "seller_name": p.seller_name or "Pranjay",
        })

    return JSONResponse(
        content=items,
        headers={"Cache-Control": "public, max-age=300, stale-while-revalidate=60"},
    )

@router.get("/{slug}", response_model=ProductRead)
async def get_product_by_slug(
    slug: str,
    session: AsyncSession = Depends(get_session)
):
    """Get product details by slug."""
    product_service = ProductService(session)
    product = await product_service.get_product_by_slug(slug)

    # Enrich with seller GST number if product has a seller
    seller_gst_number: Optional[str] = None
    if product.seller_id:
        seller_result = await session.execute(
            select(User).where(User.id == product.seller_id)
        )
        seller = seller_result.scalar_one_or_none()
        if seller:
            seller_gst_number = seller.gst_number

    product_data = ProductRead.model_validate(product)
    product_data.seller_gst_number = seller_gst_number
    return product_data


@router.get("/{slug}/variants", response_model=list[ProductListRead])
async def get_product_variants(
    slug: str,
    session: AsyncSession = Depends(get_session)
):
    """Get all variants (siblings) for a product."""
    product_service = ProductService(session)
    variants = await product_service.get_product_variants(slug)
    return [_to_list_read(v) for v in variants]

