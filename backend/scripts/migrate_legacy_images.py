"""
Migrate Legacy Images Script
Iterates through all products and product_images, finds legacy URLs (pranjay.com),
downloads them, and uploads them to Supabase Storage.
"""
import asyncio
import os
import sys
from typing import List
from dotenv import load_dotenv

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Ensure we load the .env from the backend directory BEFORE importing app.database
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(env_path)

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, or_

from app.database import async_session_maker
from app.models.product import Product, ProductImage
from app.services.storage_service import storage_service


async def migrate_images():
    """Main migration function."""
    print("🚀 Starting legacy image migration to Supabase...")
    
    success_count = 0
    fail_count = 0
    
    async with async_session_maker() as session:
        # 1. Migrate Product's primary image_url
        print("\n🔍 Scanning products for legacy image_urls...")
        product_query = select(Product).where(
            or_(
                Product.image_url.ilike("%pranjay.com%"),
                Product.image_url.ilike("%wp-content%"),
                Product.image_url.ilike("%lakme%"),
                Product.image_url.ilike("%amazon%"),
                Product.image_url.ilike("%jovees%")
            )
        )
        result = await session.execute(product_query)
        products = result.scalars().all()
        
        print(f"📦 Found {len(products)} products with external URLs.")
        
        for product in products:
            old_url = product.image_url
            if not old_url or "supabase.co" in old_url:
                continue
                
            print(f"  🔄 Migrating: {old_url}")
            new_url = await storage_service.upload_from_url(old_url)
            
            if new_url and "supabase.co" in new_url:
                product.image_url = new_url
                session.add(product)
                success_count += 1
                print(f"    ✅ Migrated to: {new_url}")
            else:
                fail_count += 1
                print(f"    ❌ FAILED")
                
        await session.commit()

        # 2. Migrate ProductImage records
        print("\n🔍 Scanning product_images for legacy URLs...")
        image_query = select(ProductImage).where(
            or_(
                ProductImage.image_url.ilike("%pranjay.com%"),
                ProductImage.image_url.ilike("%wp-content%"),
                ProductImage.image_url.ilike("%lakme%"),
                ProductImage.image_url.ilike("%amazon%"),
                ProductImage.image_url.ilike("%jovees%")
            )
        )
        result = await session.execute(image_query)
        images = result.scalars().all()
        
        print(f"🖼️ Found {len(images)} additional images.")
        
        for img in images:
            old_url = img.image_url
            if not old_url or "supabase.co" in old_url:
                continue
                
            print(f"  🔄 Migrating: {old_url}")
            new_url = await storage_service.upload_from_url(old_url)
            
            if new_url and "supabase.co" in new_url:
                img.image_url = new_url
                session.add(img)
                success_count += 1
                print(f"    ✅ Success")
            else:
                fail_count += 1
                print(f"    ❌ FAILED")
                
        await session.commit()

    print("\n🎉 Migration complete!")
    print(f"📊 Summary:")
    print(f"   ✅ Successful: {success_count}")
    print(f"   ❌ Failed:     {fail_count} (Likely blocked by pranjay.com)")


if __name__ == "__main__":
    asyncio.run(migrate_images())
