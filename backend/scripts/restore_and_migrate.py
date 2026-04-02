import asyncio
import os
import sys
import csv
import httpx
from sqlalchemy import select, update

# Add backend root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import async_session_maker
from app.models.product import Product, ProductImage
from app.services.storage_service import storage_service

CSV_PATH = "../wc-product-export-1-4-2026-1775046754937.csv"

async def restore_and_migrate():
    print("🚀 Starting Recovery & Migration...")

    # 1. Load CSV Mapping
    csv_map = {} # Name -> [Images]
    try:
        with open(CSV_PATH, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = row.get('Name')
                images_raw = row.get('Images', '')
                if name and images_raw:
                    images = [img.strip() for img in images_raw.split(',')]
                    csv_map[name] = images
        print(f"✅ Loaded {len(csv_map)} products from CSV.")
    except Exception as e:
        print(f"❌ Error loading CSV: {e}")
        return

    async with async_session_maker() as session:
        # 2. Fix Product primary image_url
        print("\n🔍 Identifying products with missing or placeholder URLs...")
        # Target both NULL and placeholder URLs
        res = await session.execute(
            select(Product).where(
                (Product.image_url == None) | 
                (Product.image_url.like('%placeholder%'))
            )
        )
        corrupted_products = res.scalars().all()
        print(f"Found {len(corrupted_products)} products to recover.")

        for p in corrupted_products:
            if p.name in csv_map:
                original_url = csv_map[p.name][0] # Primary image
                print(f"  🔄 Restoring {p.sku or p.name}: {original_url}")
                
                # Attempt migration now that we have a fix
                migrated_url = await storage_service.upload_from_url(original_url)
                p.image_url = migrated_url
                print(f"    ✅ Result: {migrated_url}")
            else:
                print(f"  ⚠️ Could not find {p.name} in CSV mapping.")

        # 3. Fix Product Image gallery
        print("\n🔍 Identifying corrupted Product Images (Gallery)...")
        res = await session.execute(select(ProductImage).where(ProductImage.image_url.like('%placeholder%')))
        corrupted_gallery = res.scalars().all()
        print(f"Found {len(corrupted_gallery)} gallery images with placeholder URLs.")

        # For gallery images, we might need a more clever match if there are multiple.
        # But we can at least restore the URLs from the CSV list.
        for gi in corrupted_gallery:
            # We need the product name for this gallery image
            prod_res = await session.execute(select(Product).where(Product.id == gi.product_id))
            product = prod_res.scalar_one_or_none()
            if product and product.name in csv_map:
                images = csv_map[product.name]
                # Try to find which index this placeholder might be? 
                # If we have multiple placeholders, we just fill them sequentially from the CSV.
                # For simplicity, we just use the first available URL that isn't already used?
                # Actually, the placeholder filename usually contains a UUID, so we lost the original order.
                # We'll just pick the first available for now or restore the whole set.
                original_url = images[0] # Fallback to first if unclear
                print(f"  🔄 Restoring Gallery for {product.name}: {original_url}")
                
                migrated_url = await storage_service.upload_from_url(original_url)
                gi.image_url = migrated_url
            else:
                print(f"  ⚠️ Could not find product for gallery image {gi.id}")

        await session.commit()
    print("\n🎉 Recovery and Migration complete!")

if __name__ == "__main__":
    asyncio.run(restore_and_migrate())
