"""
Products Router - Public product endpoints
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.cache import response_cache
from app.core.seller_branding import normalize_seller_name
from app.database import get_session
from app.models.product import Product, ProductListRead, ProductRead
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
        gst_percentage=product.gst_percentage,
        is_featured=product.is_featured,
        is_discounted_featured=product.is_discounted_featured,
        category_id=product.category_id,
        category_ids=product.category_ids or [],
        image_url=getattr(product, "image_url", None),
        primary_image=_primary_image(product),
        seller_id=product.seller_id,
        seller_name=normalize_seller_name(product.seller_name),
        parent_id=product.parent_id,
    )


def _to_public_read(product: Product) -> ProductRead:
    """Customer-facing product — seller name only, no seller GST on PDP."""
    product_data = ProductRead.model_validate(product)
    product_data.seller_name = normalize_seller_name(product_data.seller_name)
    product_data.seller_gst_number = None
    return product_data


@router.get("", response_model=PaginatedProducts)
async def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category_id: Optional[UUID] = None,
    brand_id: Optional[UUID] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_discount: Optional[float] = None,
    in_stock: Optional[bool] = None,
    is_featured: Optional[bool] = None,
    session: AsyncSession = Depends(get_session)
):
    """
    List products with filtering and pagination.
    Cached for 60 seconds (public catalog browsing).
    """
    cache_key = (
        "products_list",
        page,
        page_size,
        str(category_id) if category_id else "",
        str(brand_id) if brand_id else "",
        search or "",
        min_price,
        max_price,
        min_discount,
        in_stock,
        is_featured,
    )
    cached = response_cache.get(cache_key)
    if cached is not None:
        return JSONResponse(
            content=cached,
            headers={"Cache-Control": "public, max-age=60"},
        )

    product_service = ProductService(session)
    skip = (page - 1) * page_size

    products, total = await product_service.list_product_summaries(
        skip=skip,
        limit=page_size,
        category_id=category_id,
        brand_id=brand_id,
        search=search,
        min_price=min_price,
        max_price=max_price,
        min_discount=min_discount,
        in_stock=in_stock,
        is_featured=is_featured,
        is_active=True,
        include_total=True,
    )

    pages = (total + page_size - 1) // page_size

    response = PaginatedProducts(
        items=products,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )
    content = response.model_dump(mode="json")
    response_cache.set(cache_key, content, ttl_seconds=60)

    return JSONResponse(
        content=content,
        headers={"Cache-Control": "public, max-age=60"},
    )


@router.get("/featured", response_model=list[ProductListRead])
async def get_featured_products(
    limit: int = Query(10, ge=1, le=200),
    session: AsyncSession = Depends(get_session)
):
    """Get featured products. Cached for 2 minutes (public, rarely changes)."""
    cache_key = ("products_featured", limit)
    cached = response_cache.get(cache_key)
    if cached is not None:
        return JSONResponse(
            content=cached,
            headers={"Cache-Control": "public, max-age=120, stale-while-revalidate=30"},
        )

    product_service = ProductService(session)

    products, _ = await product_service.list_product_summaries(
        limit=limit,
        is_featured=True,
        is_active=True,
    )

    content = [i.model_dump(mode="json") for i in products]
    response_cache.set(cache_key, content, ttl_seconds=120)

    return JSONResponse(
        content=content,
        headers={"Cache-Control": "public, max-age=120, stale-while-revalidate=30"},
    )


@router.get("/brands/featured")
async def get_featured_brands(
    session: AsyncSession = Depends(get_session)
):
    """
    Get brands with their maximum discount percentage from actual product data.
    Cached for 5 minutes.
    """
    cache_key = ("products_brands_featured",)
    cached = response_cache.get(cache_key)
    if cached is not None:
        return JSONResponse(
            content=cached,
            headers={"Cache-Control": "public, max-age=300, stale-while-revalidate=60"},
        )

    from sqlalchemy import func, case
    from app.models.brand import Brand

    query = (
        select(
            Brand.id,
            Brand.name,
            Brand.slug,
            Brand.logo_url,
            func.max(
                case(
                    (Product.mrp > 0, (Product.mrp - Product.selling_price) / Product.mrp * 100),
                    else_=0
                )
            ).label("max_discount"),
        )
        .join(Product, Product.brand_id == Brand.id)
        .where(Product.is_active == True)
        .where(Brand.is_active == True)
        .group_by(Brand.id, Brand.name, Brand.slug, Brand.logo_url)
        .having(func.count(Product.id) > 0)
        .order_by(func.max(
            case(
                (Product.mrp > 0, (Product.mrp - Product.selling_price) / Product.mrp * 100),
                else_=0
            )
        ).desc())
        .limit(12)
    )

    result = await session.execute(query)
    rows = result.all()

    items = []
    for row in rows:
        discount = int(row.max_discount) if row.max_discount else 0
        items.append({
            "id": str(row.id),
            "name": row.name,
            "slug": row.slug,
            "logo_url": row.logo_url,
            "max_discount": discount,
        })

    response_cache.set(cache_key, items, ttl_seconds=300)
    return JSONResponse(
        content=items,
        headers={"Cache-Control": "public, max-age=300, stale-while-revalidate=60"},
    )


@router.get("/brands")
async def get_product_brands(
    session: AsyncSession = Depends(get_session)
):
    """
    Get all active brands that have active products.
    Used for public product filters.
    """
    cache_key = ("products_brands",)
    cached = response_cache.get(cache_key)
    if cached is not None:
        return JSONResponse(
            content=cached,
            headers={"Cache-Control": "public, max-age=300, stale-while-revalidate=60"},
        )

    from sqlalchemy import func, case
    from app.models.brand import Brand

    discount_expr = func.max(
        case(
            (Product.mrp > 0, (Product.mrp - Product.selling_price) / Product.mrp * 100),
            else_=0
        )
    )

    query = (
        select(
            Brand.id,
            Brand.name,
            Brand.slug,
            Brand.logo_url,
            discount_expr.label("max_discount"),
            func.count(Product.id).label("product_count"),
        )
        .join(Product, Product.brand_id == Brand.id)
        .where(Product.is_active == True)
        .where(Brand.is_active == True)
        .group_by(Brand.id, Brand.name, Brand.slug, Brand.logo_url)
        .having(func.count(Product.id) > 0)
        .order_by(Brand.name.asc())
    )

    result = await session.execute(query)
    items = [
        {
            "id": str(row.id),
            "name": row.name,
            "slug": row.slug,
            "logo_url": row.logo_url,
            "max_discount": int(row.max_discount) if row.max_discount else 0,
            "product_count": int(row.product_count or 0),
        }
        for row in result.all()
    ]

    response_cache.set(cache_key, items, ttl_seconds=300)
    return JSONResponse(
        content=items,
        headers={"Cache-Control": "public, max-age=300, stale-while-revalidate=60"},
    )


@router.get("/search-index")
async def get_search_index(
    session: AsyncSession = Depends(get_session)
):
    """
    Lightweight search index: returns minimal product data for client-side
    instant search. Cached for 5 minutes. Optimized with direct SQL.
    """
    cache_key = ("products_search_index",)
    cached = response_cache.get(cache_key)
    if cached is not None:
        return JSONResponse(
            content=cached,
            headers={"Cache-Control": "public, max-age=300, stale-while-revalidate=60"},
        )

    query = (
        select(
            Product.id,
            Product.name,
            Product.slug,
            Product.sku,
            Product.selling_price,
            Product.mrp,
            Product.image_url,
            Product.short_description,
            Product.seller_name
        )
        .where(Product.is_active == True)
        .order_by(Product.created_at.desc())
        .limit(2000)  # Safe to fetch up to 2000 as it's a lightweight tuple query
    )
    
    result = await session.execute(query)
    rows = result.all()
    
    items = []
    for row in rows:
        items.append({
            "id": str(row.id),
            "name": row.name,
            "slug": row.slug,
            "sku": row.sku,
            "selling_price": float(row.selling_price),
            "mrp": float(row.mrp),
            "image": row.image_url,
            "short_description": row.short_description or "",
            "seller_name": normalize_seller_name(row.seller_name),
        })

    response_cache.set(cache_key, items, ttl_seconds=300)
    return JSONResponse(
        content=items,
        headers={"Cache-Control": "public, max-age=300, stale-while-revalidate=60"},
    )

@router.get("/discounted-featured", response_model=list[ProductListRead])
async def get_discounted_featured_products(
    limit: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session)
):
    """
    Get admin-curated discounted products for the Live Discounts section on the home page.
    Only products with is_discounted_featured=True are returned.
    """
    cache_key = ("products_discounted_featured", limit)
    cached = response_cache.get(cache_key)
    if cached is not None:
        return JSONResponse(
            content=cached,
            headers={"Cache-Control": "public, max-age=120, stale-while-revalidate=30"},
        )

    product_service = ProductService(session)

    products, _ = await product_service.list_product_summaries(
        limit=limit,
        is_active=True,
        is_discounted_featured=True,
    )

    content = [i.model_dump(mode="json") for i in products]
    response_cache.set(cache_key, content, ttl_seconds=120)

    return JSONResponse(
        content=content,
        headers={"Cache-Control": "public, max-age=120, stale-while-revalidate=30"},
    )


class CatalogBootstrapResponse(BaseModel):
    """Single round-trip for products page: filters + first page of products."""
    categories: list
    brands: list
    products: PaginatedProducts


@router.get("/catalog-bootstrap", response_model=CatalogBootstrapResponse)
async def catalog_bootstrap(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category_id: Optional[UUID] = None,
    brand_id: Optional[UUID] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_discount: Optional[float] = None,
    in_stock: Optional[bool] = None,
    session: AsyncSession = Depends(get_session),
):
    """
    One request for the products page: categories, brands, and paginated products.
    Replaces 3 separate frontend calls (~400–900ms saved on cold paths).
    """
    cache_key = (
        "catalog_bootstrap",
        page,
        page_size,
        str(category_id) if category_id else "",
        str(brand_id) if brand_id else "",
        search or "",
        min_price,
        max_price,
        min_discount,
        in_stock,
    )
    cached = response_cache.get(cache_key)
    if cached is not None:
        return JSONResponse(
            content=cached,
            headers={"Cache-Control": "public, max-age=60, stale-while-revalidate=30"},
        )

    from app.models.category import Category, CategoryRead
    from app.models.brand import Brand
    from sqlalchemy import func, case

    product_service = ProductService(session)
    skip = (page - 1) * page_size

    cat_result = await session.execute(
        select(Category)
        .where(Category.is_active == True)
        .order_by(Category.sort_order, Category.name)
    )
    categories = [
        CategoryRead.model_validate(c).model_dump(mode="json")
        for c in cat_result.scalars().all()
    ]

    discount_expr = func.max(
        case(
            (Product.mrp > 0, (Product.mrp - Product.selling_price) / Product.mrp * 100),
            else_=0,
        )
    )
    brand_result = await session.execute(
        select(
            Brand.id,
            Brand.name,
            Brand.slug,
            Brand.logo_url,
            discount_expr.label("max_discount"),
            func.count(Product.id).label("product_count"),
        )
        .join(Product, Product.brand_id == Brand.id)
        .where(Product.is_active == True)
        .where(Brand.is_active == True)
        .group_by(Brand.id, Brand.name, Brand.slug, Brand.logo_url)
        .having(func.count(Product.id) > 0)
        .order_by(Brand.name.asc())
    )
    brands = [
        {
            "id": str(row.id),
            "name": row.name,
            "slug": row.slug,
            "logo_url": row.logo_url,
            "max_discount": int(row.max_discount) if row.max_discount else 0,
            "product_count": int(row.product_count or 0),
        }
        for row in brand_result.all()
    ]

    products, total = await product_service.list_product_summaries(
        skip=skip,
        limit=page_size,
        category_id=category_id,
        brand_id=brand_id,
        search=search,
        min_price=min_price,
        max_price=max_price,
        min_discount=min_discount,
        in_stock=in_stock,
        is_active=True,
        include_total=True,
    )
    pages = (total + page_size - 1) // page_size
    paginated = PaginatedProducts(
        items=products,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )

    content = CatalogBootstrapResponse(
        categories=categories,
        brands=brands,
        products=paginated,
    ).model_dump(mode="json")
    response_cache.set(cache_key, content, ttl_seconds=60)

    return JSONResponse(
        content=content,
        headers={"Cache-Control": "public, max-age=60, stale-while-revalidate=30"},
    )


class ProductDetailBundle(BaseModel):
    """Product + variants + related items in one response."""
    product: ProductRead
    variants: list[ProductListRead]
    related: list[ProductListRead]


@router.get("/{slug}/detail", response_model=ProductDetailBundle)
async def get_product_detail_bundle(
    slug: str,
    session: AsyncSession = Depends(get_session),
):
    """Single round-trip for product detail page (product, variants, related)."""
    cache_key = ("product_detail_bundle", slug)
    cached = response_cache.get(cache_key)
    if cached is not None:
        return JSONResponse(
            content=cached,
            headers={"Cache-Control": "public, max-age=120, stale-while-revalidate=30"},
        )

    product_service = ProductService(session)
    product = await product_service.get_product_by_slug(slug)
    variants = await product_service.get_product_variants(slug)

    related_items: list[ProductListRead] = []
    if product.category_id:
        related_raw, _ = await product_service.list_product_summaries(
            limit=8,
            category_id=product.category_id,
            is_active=True,
        )
        related_items = [r for r in related_raw if r.id != product.id][:4]

    product_data = _to_public_read(product)

    bundle = ProductDetailBundle(
        product=product_data,
        variants=[_to_list_read(v) for v in variants],
        related=related_items,
    )
    content = bundle.model_dump(mode="json")
    response_cache.set(cache_key, content, ttl_seconds=120)

    return JSONResponse(
        content=content,
        headers={"Cache-Control": "public, max-age=120, stale-while-revalidate=30"},
    )


@router.get("/{slug}", response_model=ProductRead)
async def get_product_by_slug(
    slug: str,
    session: AsyncSession = Depends(get_session)
):
    """Get product details by slug. Cached 2 minutes."""
    cache_key = ("product_slug", slug)
    cached = response_cache.get(cache_key)
    if cached is not None:
        return JSONResponse(
            content=cached,
            headers={"Cache-Control": "public, max-age=120, stale-while-revalidate=30"},
        )

    product_service = ProductService(session)
    product = await product_service.get_product_by_slug(slug)

    product_data = _to_public_read(product)
    content = product_data.model_dump(mode="json")
    response_cache.set(cache_key, content, ttl_seconds=120)

    return JSONResponse(
        content=content,
        headers={"Cache-Control": "public, max-age=120, stale-while-revalidate=30"},
    )


@router.get("/{slug}/variants", response_model=list[ProductListRead])
async def get_product_variants(
    slug: str,
    session: AsyncSession = Depends(get_session)
):
    """Get all variants (siblings) for a product."""
    product_service = ProductService(session)
    variants = await product_service.get_product_variants(slug)
    return [_to_list_read(v) for v in variants]
