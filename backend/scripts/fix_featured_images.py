import asyncio
import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(env_path)

from sqlalchemy import select
from app.database import async_session_maker
from app.models.product import Product, ProductImage
from app.services.storage_service import storage_service

# SKU mapping to direct known-good URLs
FIX_MAP = {
    "WC-4210": "https://rukmini1.flixcart.com/image/1500/1500/xif0q/moisturizer-cream/s/l/q/300-aloevera-moisturising-beauty-gel-150g-each-pack-of-2-nature-original-imah44sygkpvfys7.jpeg",
    "WC-4214": "https://m.media-amazon.com/images/I/618hZAUSFaL._AC_UF350,350_QL80_.jpg",
    "WC-4258": "https://m.media-amazon.com/images/I/71D0YyM19jL._AC_UF1000,1000_QL80_.jpg",
    "WC-4209": "https://rukmini1.flixcart.com/image/1500/1500/xif0q/face-wash/g/n/c/65-flawless-papaya-gel-nature-s-essence-original-imaghfsjghbhkzzy.jpeg",
    "WC-4260": "https://shahnaz.in/cdn/shop/products/DiamondKit_11zon.jpg",
    "WC-4263": "https://images-static.nykaa.com/media/catalog/product/d/4/d40a72e12979_H-8901030825286.jpg",
    "WC-4262": "https://images-static.nykaa.com/media/catalog/product/1/8/18d33a48901030650284_1509231.jpg",
    "WC-4213": "https://m.media-amazon.com/images/I/512DI1GN3JL._SX679_.jpg",
    "WC-4206": "https://m.media-amazon.com/images/I/71tkEmHhE9L._SX679_.jpg",
    "WC-4261": "https://shahnaz.in/cdn/shop/files/F1622.jpg?v=1755323906&width=1445",
    "WC-4255": "https://shahnaz.in/cdn/shop/files/F1622.jpg?v=1755323906&width=1445",
    "WC-4208": "https://m.media-amazon.com/images/I/61H+k8t+qIL._SL1500_.jpg",
    "WC-4215": "https://m.media-amazon.com/images/I/61P-J8C-Y4S._SL1500_.jpg",
    "WC-4212": "https://m.media-amazon.com/images/I/71Yy-E0XQUL._SL1500_.jpg",
    "WC-4211": "https://m.media-amazon.com/images/I/61+t-H51D7L._SL1500_.jpg",
    "WC-4205": "https://m.media-amazon.com/images/I/61u9-pGf7vL._SL1500_.jpg",
}

async def fix_images():
    async with async_session_maker() as session:
        print(f"🚀 Starting manual image fix for {len(FIX_MAP)} products...")
        
        for sku, external_url in FIX_MAP.items():
            # Find product
            query = select(Product).filter(Product.sku == sku)
            result = await session.execute(query)
            product = result.scalar_one_or_none()
            
            if not product:
                print(f"  ⚠️ Product {sku} not found, skipping.")
                continue
                
            print(f"  🔄 Migrating {sku} from: {external_url}")
            
            # Upload to Supabase via StorageService
            new_url = await storage_service.upload_from_url(external_url)
            
            if new_url and "supabase.co" in new_url:
                # Update Product.image_url
                product.image_url = new_url
                session.add(product)
                
                # Update ProductImage primary record directly
                from sqlalchemy import update
                await session.execute(
                    update(ProductImage)
                    .where(ProductImage.product_id == product.id, ProductImage.is_primary == True)
                    .values(image_url=new_url)
                )
                
                print(f"    ✅ Success: {new_url}")
            else:
                print(f"    ❌ Failed to migrate {sku}")
                
        await session.commit()
    print("\n🎉 Manual fix complete!")

if __name__ == "__main__":
    asyncio.run(fix_images())
