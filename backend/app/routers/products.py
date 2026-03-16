"""
Products Router - Public product endpoints
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_session
from app.models.product import ProductListRead, ProductRead
from app.services.product_service import ProductService

router = APIRouter()


class PaginatedProducts(BaseModel):
    """Paginated products response."""
    items: list[ProductListRead]
    total: int
    page: int
    page_size: int
    pages: int


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
    Public endpoint.
    """
    product_service = ProductService(session)
    
    skip = (page - 1) * page_size
    
    products = await product_service.list_products(
        skip=skip,
        limit=page_size,
        category_id=category_id,
        brand_id=brand_id,
        search=search,
        min_price=min_price,
        max_price=max_price,
        is_featured=is_featured,
        is_active=True
    )
    
    total = await product_service.count_products(
        category_id=category_id,
        brand_id=brand_id,
        is_active=True
    )
    
    # Transform to list read format
    items = []
    for product in products:
        primary_image = None
        if product.images:
            primary = next((img for img in product.images if img.is_primary), None)
            primary_image = primary.image_url if primary else (
                product.images[0].image_url if product.images else None
            )
        
        items.append(ProductListRead(
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
            primary_image=primary_image
        ))
    
    pages = (total + page_size - 1) // page_size
    
    return PaginatedProducts(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages
    )


@router.get("/featured", response_model=list[ProductListRead])
async def get_featured_products(
    limit: int = Query(10, ge=1, le=50),
    session: AsyncSession = Depends(get_session)
):
    """Get featured products."""
    product_service = ProductService(session)
    
    products = await product_service.list_products(
        limit=limit,
        is_featured=True,
        is_active=True
    )
    
    items = []
    for product in products:
        primary_image = None
        if product.images:
            primary = next((img for img in product.images if img.is_primary), None)
            primary_image = primary.image_url if primary else (
                product.images[0].image_url if product.images else None
            )
        
        items.append(ProductListRead(
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
            primary_image=primary_image
        ))
    
    return items


@router.get("/{slug}", response_model=ProductRead)
async def get_product_by_slug(
    slug: str,
    session: AsyncSession = Depends(get_session)
):
    """Get product details by slug."""
    product_service = ProductService(session)
    product = await product_service.get_product_by_slug(slug)
    return product
