"""
Admin Products Router
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.dependencies import get_current_admin
from app.database import get_session
from app.models.product import ProductCreate, ProductRead, ProductUpdate
from app.models.user import User
from app.services.product_service import ProductService
from app.services.storage_service import storage_service

router = APIRouter()


class PaginatedProductsAdmin(BaseModel):
    """Paginated products for admin."""
    items: list[ProductRead]
    total: int
    page: int
    page_size: int


@router.get("", response_model=PaginatedProductsAdmin)
async def list_products_admin(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category_id: Optional[UUID] = None,
    brand_id: Optional[UUID] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """List all products (admin view)."""
    product_service = ProductService(session)
    
    skip = (page - 1) * page_size
    
    products = await product_service.list_products(
        skip=skip,
        limit=page_size,
        category_id=category_id,
        brand_id=brand_id,
        is_active=is_active,
        search=search
    )
    
    total = await product_service.count_products(
        category_id=category_id,
        brand_id=brand_id,
        is_active=is_active
    )
    
    return PaginatedProductsAdmin(
        items=products,
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("", response_model=ProductRead, status_code=201)
async def create_product(
    data: ProductCreate,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """Create a new product."""
    product_service = ProductService(session)
    return await product_service.create_product(data)


@router.get("/{product_id}", response_model=ProductRead)
async def get_product(
    product_id: UUID,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """Get product by ID."""
    product_service = ProductService(session)
    return await product_service.get_product_by_id(product_id)


@router.patch("/{product_id}", response_model=ProductRead)
async def update_product(
    product_id: UUID,
    data: ProductUpdate,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """Update a product."""
    product_service = ProductService(session)
    return await product_service.update_product(product_id, data)


@router.delete("/{product_id}", status_code=204)
async def delete_product(
    product_id: UUID,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """Delete (soft) a product."""
    product_service = ProductService(session)
    await product_service.delete_product(product_id)


@router.post("/{product_id}/images", status_code=201)
async def upload_product_image(
    product_id: UUID,
    file: UploadFile = File(...),
    is_primary: bool = False,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """Upload product image."""
    product_service = ProductService(session)
    
    # Upload to storage
    file_content = await file.read()
    image_url = await storage_service.upload_product_image(
        file_content,
        file.filename,
        file.content_type
    )
    
    # Add to product
    image = await product_service.add_product_image(
        product_id,
        image_url,
        alt_text=file.filename,
        is_primary=is_primary
    )
    
    return {"id": str(image.id), "image_url": image.image_url}


@router.delete("/{product_id}/images/{image_id}", status_code=204)
async def delete_product_image(
    product_id: UUID,
    image_id: UUID,
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """Delete product image."""
    product_service = ProductService(session)
    await product_service.remove_product_image(image_id)
