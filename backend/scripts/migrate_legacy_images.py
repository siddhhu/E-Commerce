"""
Migrate Legacy Images Script
Iterates through all products and product_images, finds legacy URLs (pranjay.com),
downloads them, and uploads them to Supabase Storage.
"""
import asyncio
import os
import sys
from typing import List

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, or_

from app.database import async_session_maker
from app.models.product import Product, ProductImage
from app.services.storage_service import storage_service


async def migrate_images():
    """Main migration function."""
    print("🚀 Starting legacy image migration to Supabase...")
    
    async with async_session_maker() as session:
        # 1. Migrate Product's primary image_url
        print("\n🔍 Scanning products for legacy image_urls...")
        product_query = select(Product).where(
            or_(
                Product.image_url.like("%pranjay.com%"),
                Product.image_url.like("%wp-content%")
            )
        )
        result = await session.execute(product_query)
        products = result.scalars().all()
        
        print(f"📦 Found {len(products)} products with legacy URLs.")
        
        for product in products:
            old_url = product.image_url
            print(f"  🔄 Migrating product {product.sku}: {old_url}")
            
            new_url = await storage_service.upload_from_url(old_url)
            
            if new_url != old_url:
                product.image_url = new_url
                session.add(product)
                print(f"  ✅ Success: {new_url}")
            else:
                print(f"  ⚠️  Failed to migrate: {old_url}")
                
        await session.commit()
        print("💾 Committed product updates.")

        # 2. Migrate ProductImage records
        print("\n🔍 Scanning product_images for legacy URLs...")
        image_query = select(ProductImage).where(
            or_(
                ProductImage.image_url.like("%pranjay.com%"),
                ProductImage.image_url.like("%wp-content%")
            )
        )
        result = await session.execute(image_query)
        images = result.scalars().all()
        
        print(f"🖼️ Found {len(images)} additional product images with legacy URLs.")
        
        for img in images:
            old_url = img.image_url
            print(f"  🔄 Migrating image {img.id}: {old_url}")
            
            new_url = await storage_service.upload_from_url(old_url)
            
            if new_url != old_url:
                img.image_url = new_url
                session.add(img)
                print(f"  ✅ Success: {new_url}")
            else:
                print(f"  ⚠️  Failed to migrate: {old_url}")
                
        await session.commit()
        print("💾 Committed image updates.")

    print("\n🎉 Migration complete!")


if __name__ == "__main__":
    asyncio.run(migrate_images())
