"""
Product Service - Product operations
"""
from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import select, or_
from slugify import slugify

from app.core.exceptions import ConflictException, NotFoundException
from app.models.product import Product, ProductCreate, ProductImage, ProductUpdate


class ProductService:
    """Service for product operations."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_product_by_id(self, product_id: UUID) -> Product:
        """Get product by ID or raise exception."""
        result = await self.session.execute(
            select(Product).options(selectinload(Product.images)).where(Product.id == product_id)
        )
        product = result.scalar_one_or_none()
        
        if not product:
            raise NotFoundException("Product")
        
        return product
    
    async def get_product_by_slug(self, slug: str) -> Product:
        """Get product by slug or raise exception."""
        result = await self.session.execute(
            select(Product).options(selectinload(Product.images)).where(Product.slug == slug)
        )
        product = result.scalar_one_or_none()
        
        if not product:
            raise NotFoundException("Product")
        
        return product
    
    async def list_products(
        self,
        skip: int = 0,
        limit: int = 20,
        category_id: Optional[UUID] = None,
        brand_id: Optional[UUID] = None,
        is_active: bool = True,
        is_featured: Optional[bool] = None,
        search: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        min_discount: Optional[float] = None,
        in_stock: Optional[bool] = None,
        seller_id: Optional[UUID] = None
    ) -> list[Product]:
        """List products with filters. Pass seller_id to restrict to that seller's products."""
        from sqlalchemy import cast, String
        query = select(Product).options(selectinload(Product.images))

        if is_active is not None:
            query = query.where(Product.is_active == is_active)
        if category_id:
            # Match against both legacy category_id FK and new category_ids JSON array
            cat_str = str(category_id)
            query = query.where(
                or_(
                    Product.category_id == category_id,
                    cast(Product.category_ids, String).contains(cat_str)
                )
            )
        if brand_id:
            query = query.where(Product.brand_id == brand_id)
        if is_featured is not None:
            query = query.where(Product.is_featured == is_featured)
        if search:
            # Multi-token AND search across name, description, sku, short_description
            tokens = [t.strip() for t in search.split() if t.strip()]
            for token in tokens:
                pattern = f"%{token}%"
                query = query.where(
                    or_(
                        Product.name.ilike(pattern),
                        Product.description.ilike(pattern),
                        Product.sku.ilike(pattern),
                        Product.short_description.ilike(pattern),
                    )
                )
        if min_price is not None:
            query = query.where(Product.selling_price >= min_price)
        if max_price is not None:
            query = query.where(Product.selling_price <= max_price)
        if min_discount is not None:
            query = query.where(Product.mrp > 0)
            query = query.where(((Product.mrp - Product.selling_price) / Product.mrp * 100) >= min_discount)
        if in_stock is not None:
            query = query.where(Product.stock_quantity > 0 if in_stock else Product.stock_quantity <= 0)
        if seller_id is not None:
            query = query.where(Product.seller_id == seller_id)

        query = query.offset(skip).limit(limit).order_by(Product.created_at.desc())

        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def count_products(
        self,
        category_id: Optional[UUID] = None,
        brand_id: Optional[UUID] = None,
        is_active: bool = True,
        is_featured: Optional[bool] = None,
        search: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        min_discount: Optional[float] = None,
        in_stock: Optional[bool] = None,
        seller_id: Optional[UUID] = None
    ) -> int:
        """Count products with filters."""
        from sqlalchemy import func

        query = select(func.count(Product.id))

        if is_active is not None:
            query = query.where(Product.is_active == is_active)
        if category_id:
            from sqlalchemy import cast, String
            cat_str = str(category_id)
            query = query.where(
                or_(
                    Product.category_id == category_id,
                    cast(Product.category_ids, String).contains(cat_str)
                )
            )
        if brand_id:
            query = query.where(Product.brand_id == brand_id)
        if is_featured is not None:
            query = query.where(Product.is_featured == is_featured)
        if search:
            tokens = [t.strip() for t in search.split() if t.strip()]
            for token in tokens:
                pattern = f"%{token}%"
                query = query.where(
                    or_(
                        Product.name.ilike(pattern),
                        Product.description.ilike(pattern),
                        Product.sku.ilike(pattern),
                        Product.short_description.ilike(pattern),
                    )
                )
        if min_price is not None:
            query = query.where(Product.selling_price >= min_price)
        if max_price is not None:
            query = query.where(Product.selling_price <= max_price)
        if min_discount is not None:
            query = query.where(Product.mrp > 0)
            query = query.where(((Product.mrp - Product.selling_price) / Product.mrp * 100) >= min_discount)
        if in_stock is not None:
            query = query.where(Product.stock_quantity > 0 if in_stock else Product.stock_quantity <= 0)
        if seller_id is not None:
            query = query.where(Product.seller_id == seller_id)

        result = await self.session.execute(query)
        return result.scalar() or 0
    
    async def get_product_variants(self, slug: str) -> Sequence[Product]:
        """Get all sibling products including the parent product."""
        # Lightweight query just to find the parent_id
        id_query = select(Product.id, Product.parent_id).where(Product.slug == slug)
        id_result = await self.session.execute(id_query)
        row = id_result.first()
        
        if not row:
            raise NotFoundException("Product")
            
        target_parent_id = row.parent_id or row.id
        
        query = select(Product).options(
            selectinload(Product.images)
        ).where(
            or_(
                Product.id == target_parent_id,
                Product.parent_id == target_parent_id
            ),
            Product.is_active == True
        )
        result = await self.session.execute(query)
        return result.scalars().all()

    async def create_product(self, data: ProductCreate) -> Product:
        """Create a new product."""
        # Check for duplicate SKU
        existing = await self.session.execute(
            select(Product).where(Product.sku == data.sku)
        )
        if existing.scalar_one_or_none():
            raise ConflictException(f"Product with SKU {data.sku} already exists")
        
        # Validate pricing
        if data.selling_price > data.mrp:
            from app.core.exceptions import ValidationException
            raise ValidationException("Selling price cannot be greater than MRP")
        
        # Auto-sync category_id from category_ids (first element)
        if data.category_ids and len(data.category_ids) > 0:
            from uuid import UUID as UUIDType
            try:
                data.category_id = UUIDType(data.category_ids[0])
            except (ValueError, IndexError):
                pass
        
        # Auto-generate slug if not unique
        slug = data.slug or slugify(data.name)
        existing_slug = await self.session.execute(
            select(Product).where(Product.slug == slug)
        )
        if existing_slug.scalar_one_or_none():
            slug = f"{slug}-{data.sku}"
        
        product = Product(
            **data.model_dump(exclude={"slug"}),
            slug=slug
        )
        
        self.session.add(product)
        await self.session.commit()
        await self.session.refresh(product)

        # Load relationships for response model
        result = await self.session.execute(
            select(Product).options(selectinload(Product.images)).where(Product.id == product.id)
        )
        return result.scalar_one()
    
    async def update_product(self, product_id: UUID, data: ProductUpdate) -> Product:
        """Update a product."""
        product = await self.get_product_by_id(product_id)
        
        update_data = data.model_dump(exclude_unset=True)
        
        # Auto-sync category_id from category_ids if provided
        if 'category_ids' in update_data and update_data['category_ids'] and len(update_data['category_ids']) > 0:
            from uuid import UUID as UUIDType
            try:
                update_data['category_id'] = UUIDType(update_data['category_ids'][0])
            except (ValueError, IndexError):
                pass
        
        for field, value in update_data.items():
            setattr(product, field, value)
        
        self.session.add(product)
        await self.session.commit()
        await self.session.refresh(product)

        # Load relationships for response model
        result = await self.session.execute(
            select(Product).options(selectinload(Product.images)).where(Product.id == product.id)
        )
        return result.scalar_one()
    
    async def delete_product(self, product_id: UUID) -> None:
        """Delete a product (soft delete by setting is_active=False)."""
        product = await self.get_product_by_id(product_id)
        product.is_active = False
        
        self.session.add(product)
        await self.session.commit()
    
    async def add_product_image(
        self,
        product_id: UUID,
        image_url: str,
        alt_text: Optional[str] = None,
        is_primary: bool = False
    ) -> ProductImage:
        """Add an image to a product."""
        product = await self.get_product_by_id(product_id)
        
        # If this is primary, unset other primary images
        if is_primary:
            result = await self.session.execute(
                select(ProductImage).where(
                    ProductImage.product_id == product_id,
                    ProductImage.is_primary == True
                )
            )
            for img in result.scalars():
                img.is_primary = False
                self.session.add(img)

            # Keep Product.image_url in sync for primary image.
            product.image_url = image_url
            self.session.add(product)
        
        # Get max sort order
        result = await self.session.execute(
            select(ProductImage)
            .where(ProductImage.product_id == product_id)
            .order_by(ProductImage.sort_order.desc())
            .limit(1)
        )
        last_image = result.scalar_one_or_none()
        sort_order = (last_image.sort_order + 1) if last_image else 0
        
        image = ProductImage(
            product_id=product_id,
            image_url=image_url,
            alt_text=alt_text or product.name,
            is_primary=is_primary,
            sort_order=sort_order
        )
        
        self.session.add(image)
        await self.session.commit()
        await self.session.refresh(image)
        
        return image
    
    async def remove_product_image(self, image_id: UUID) -> None:
        """Remove an image from a product."""
        result = await self.session.execute(
            select(ProductImage).where(ProductImage.id == image_id)
        )
        image = result.scalar_one_or_none()
        
        if not image:
            raise NotFoundException("Image")
        
        await self.session.delete(image)
        await self.session.commit()
    
    async def update_stock(self, product_id: UUID, quantity_change: int) -> Product:
        """Update product stock quantity."""
        product = await self.get_product_by_id(product_id)
        product.stock_quantity += quantity_change
        
        if product.stock_quantity < 0:
            product.stock_quantity = 0
        
        self.session.add(product)
        await self.session.commit()
        await self.session.refresh(product)
        
        return product
