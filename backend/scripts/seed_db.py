"""
Database seed script for Pranjay ecommerce platform.
Run this script to populate the database with initial categories, brands, and products.

Usage:
    cd backend
    python -m scripts.seed_db
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import init_db, get_session, close_db, async_session
from app.models.category import Category
from app.models.brand import Brand
from app.models.product import Product, ProductImage


# Seed data
CATEGORIES = [
    {"name": "Lipsticks", "slug": "lipsticks", "description": "Explore our range of lipsticks, glosses, and lip care products", "is_active": True},
    {"name": "Foundations", "slug": "foundations", "description": "Find your perfect match with our foundation collection", "is_active": True},
    {"name": "Eye Makeup", "slug": "eye-makeup", "description": "Eyeshadows, mascaras, eyeliners and more", "is_active": True},
    {"name": "Skincare", "slug": "skincare", "description": "Nourish your skin with our premium skincare products", "is_active": True},
]

BRANDS = [
    {"name": "Pranjay Beauty", "slug": "pranjay-beauty", "description": "Our flagship cosmetics brand", "is_active": True},
    {"name": "Glow Studio", "slug": "glow-studio", "description": "Professional makeup for everyone", "is_active": True},
    {"name": "Pure Glow", "slug": "pure-glow", "description": "Natural and organic skincare", "is_active": True},
]

PRODUCTS = [
    {
        "name": "Matte Velvet Lipstick - Ruby Red",
        "slug": "matte-velvet-lipstick-ruby-red",
        "sku": "LIP-001",
        "description": "A stunning matte lipstick that delivers intense color payoff with a velvet-soft finish. Long-lasting formula that stays put for up to 8 hours without drying your lips.",
        "short_description": "Long-lasting matte finish, 8-hour wear",
        "mrp": 599.00,
        "selling_price": 449.00,
        "b2b_price": 320.00,
        "stock_quantity": 150,
        "min_order_quantity": 5,
        "unit": "pcs",
        "is_active": True,
        "is_featured": True,
        "category_slug": "lipsticks",
        "brand_slug": "pranjay-beauty",
        "image_url": "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=500",
    },
    {
        "name": "HD Foundation - Natural Beige",
        "slug": "hd-foundation-natural-beige",
        "sku": "FND-001",
        "description": "Achieve flawless, camera-ready skin with our HD Foundation. Lightweight, buildable coverage that lasts all day. Enriched with vitamin E for skin nourishment.",
        "short_description": "Buildable coverage, vitamin E enriched",
        "mrp": 899.00,
        "selling_price": 699.00,
        "b2b_price": 480.00,
        "stock_quantity": 200,
        "min_order_quantity": 3,
        "unit": "pcs",
        "is_active": True,
        "is_featured": True,
        "category_slug": "foundations",
        "brand_slug": "pranjay-beauty",
        "image_url": "https://images.unsplash.com/photo-1631214540553-ff044a3ff1d4?w=500",
    },
    {
        "name": "Smokey Eye Palette - Midnight",
        "slug": "smokey-eye-palette-midnight",
        "sku": "EYE-001",
        "description": "12 stunning shades perfect for creating dramatic smokey eyes or subtle everyday looks. Highly pigmented, blendable formula with both matte and shimmer finishes.",
        "short_description": "12 shades, matte & shimmer",
        "mrp": 1299.00,
        "selling_price": 999.00,
        "b2b_price": 650.00,
        "stock_quantity": 80,
        "min_order_quantity": 2,
        "unit": "pcs",
        "is_active": True,
        "is_featured": True,
        "category_slug": "eye-makeup",
        "brand_slug": "glow-studio",
        "image_url": "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=500",
    },
    {
        "name": "Hydrating Face Serum",
        "slug": "hydrating-face-serum",
        "sku": "SKN-001",
        "description": "Intense hydration serum with hyaluronic acid and vitamin C. Plumps and brightens skin while providing 72-hour moisture retention.",
        "short_description": "Hyaluronic acid + Vitamin C",
        "mrp": 799.00,
        "selling_price": 599.00,
        "b2b_price": 420.00,
        "stock_quantity": 120,
        "min_order_quantity": 5,
        "unit": "pcs",
        "is_active": True,
        "is_featured": False,
        "category_slug": "skincare",
        "brand_slug": "pure-glow",
        "image_url": "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500",
    },
    {
        "name": "Volumizing Mascara - Jet Black",
        "slug": "volumizing-mascara-jet-black",
        "sku": "EYE-002",
        "description": "Get dramatic lashes with our volumizing mascara. Clump-free formula that adds volume and length. Water-resistant and smudge-proof.",
        "short_description": "Clump-free, water-resistant",
        "mrp": 499.00,
        "selling_price": 399.00,
        "b2b_price": 280.00,
        "stock_quantity": 250,
        "min_order_quantity": 10,
        "unit": "pcs",
        "is_active": True,
        "is_featured": False,
        "category_slug": "eye-makeup",
        "brand_slug": "pranjay-beauty",
        "image_url": "https://images.unsplash.com/photo-1631214500115-598fc2cb8c8f?w=500",
    },
    {
        "name": "Nude Lip Gloss - Honey",
        "slug": "nude-lip-gloss-honey",
        "sku": "LIP-002",
        "description": "Sheer, glossy finish with a hint of color. Non-sticky formula that keeps lips hydrated and plump all day long.",
        "short_description": "Non-sticky, hydrating formula",
        "mrp": 399.00,
        "selling_price": 299.00,
        "b2b_price": 210.00,
        "stock_quantity": 180,
        "min_order_quantity": 10,
        "unit": "pcs",
        "is_active": True,
        "is_featured": False,
        "category_slug": "lipsticks",
        "brand_slug": "glow-studio",
        "image_url": "https://images.unsplash.com/photo-1619451334792-150fd785ee74?w=500",
    },
    {
        "name": "Setting Powder - Translucent",
        "slug": "setting-powder-translucent",
        "sku": "FND-002",
        "description": "Finely milled translucent powder that sets makeup and controls shine. Blurs imperfections for a flawless, airbrushed finish.",
        "short_description": "Oil control, blurs imperfections",
        "mrp": 649.00,
        "selling_price": 499.00,
        "b2b_price": 350.00,
        "stock_quantity": 90,
        "min_order_quantity": 5,
        "unit": "pcs",
        "is_active": True,
        "is_featured": False,
        "category_slug": "foundations",
        "brand_slug": "pranjay-beauty",
        "image_url": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500",
    },
    {
        "name": "Rose Face Mist",
        "slug": "rose-face-mist",
        "sku": "SKN-002",
        "description": "Refreshing rose water mist that hydrates, tones, and sets makeup. Perfect for a quick pick-me-up anytime during the day.",
        "short_description": "Hydrating rose water formula",
        "mrp": 349.00,
        "selling_price": 249.00,
        "b2b_price": 180.00,
        "stock_quantity": 300,
        "min_order_quantity": 12,
        "unit": "pcs",
        "is_active": True,
        "is_featured": True,
        "category_slug": "skincare",
        "brand_slug": "pure-glow",
        "image_url": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500",
    },
]


async def seed_database():
    """Seed the database with initial data."""
    print("🌱 Starting database seed...")
    
    await init_db()
    
    async with async_session() as session:
        # Seed categories
        print("\n📁 Seeding categories...")
        category_map = {}
        for cat_data in CATEGORIES:
            # Check if exists
            result = await session.execute(
                select(Category).where(Category.slug == cat_data["slug"])
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                print(f"  ⏭️  Category '{cat_data['name']}' already exists")
                category_map[cat_data["slug"]] = existing
            else:
                category = Category(**cat_data)
                session.add(category)
                await session.flush()
                category_map[cat_data["slug"]] = category
                print(f"  ✅ Created category: {cat_data['name']}")
        
        # Seed brands
        print("\n🏷️  Seeding brands...")
        brand_map = {}
        for brand_data in BRANDS:
            result = await session.execute(
                select(Brand).where(Brand.slug == brand_data["slug"])
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                print(f"  ⏭️  Brand '{brand_data['name']}' already exists")
                brand_map[brand_data["slug"]] = existing
            else:
                brand = Brand(**brand_data)
                session.add(brand)
                await session.flush()
                brand_map[brand_data["slug"]] = brand
                print(f"  ✅ Created brand: {brand_data['name']}")
        
        # Seed products
        print("\n📦 Seeding products...")
        for prod_data in PRODUCTS:
            result = await session.execute(
                select(Product).where(Product.slug == prod_data["slug"])
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                print(f"  ⏭️  Product '{prod_data['name']}' already exists")
                continue
            
            # Get category and brand IDs
            category = category_map.get(prod_data.pop("category_slug"))
            brand = brand_map.get(prod_data.pop("brand_slug"))
            image_url = prod_data.pop("image_url")
            
            if not category or not brand:
                print(f"  ❌ Skipping product '{prod_data['name']}': missing category or brand")
                continue
            
            product = Product(
                **prod_data,
                category_id=category.id,
                brand_id=brand.id,
            )
            session.add(product)
            await session.flush()
            
            # Add product image
            image = ProductImage(
                product_id=product.id,
                image_url=image_url,
                alt_text=prod_data["name"],
                is_primary=True,
                sort_order=0,
            )
            session.add(image)
            
            print(f"  ✅ Created product: {prod_data['name']}")
        
        await session.commit()
    
    await close_db()
    print("\n🎉 Database seeding completed!")


if __name__ == "__main__":
    asyncio.run(seed_database())
