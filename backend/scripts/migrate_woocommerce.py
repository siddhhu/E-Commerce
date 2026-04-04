"""
WooCommerce → Pranjay Supabase Migration Script
Reads the WC product export CSV and inserts products + images into Supabase.

Usage:
    python scripts/migrate_woocommerce.py

Requirements: run from the backend/ directory with venv activated.
"""
import asyncio
import csv
import re
import sys
import os
import uuid

# Make sure backend app is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import async_session_maker
from app.models.product import Product, ProductImage
from app.models.category import Category

# ── Path to the exported CSV ──────────────────────────────────────────────────
CSV_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "wc-product-export-1-4-2026-1775046754937.csv",
)
# Move CSV up one level if not found
if not os.path.exists(CSV_PATH):
    CSV_PATH = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "wc-product-export-1-4-2026-1775046754937.csv",
    )

# ── Helpers ───────────────────────────────────────────────────────────────────

def slugify(text: str) -> str:
    """Convert product name to a URL-safe slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text[:80]

def strip_html(text: str) -> str:
    """Remove HTML tags from description."""
    if not text:
        return ""
    clean = re.sub(r"<[^>]+>", " ", text)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean[:2000]  # cap to avoid DB issues

def extract_images(images_field: str, description: str = "", short_description: str = "") -> list[str]:
    """Extract list of image URLs from CSV field and HTML descriptions."""
    if not images_field:
        images_field = ""
    
    # 1. Primary images from column
    primary_urls = [u.strip() for u in images_field.split(",") if u.strip().startswith("http")]
    
    # 2. Extract from descriptions (Regex for image URLs)
    combined_desc = f"{description} {short_description}"
    pattern = r'https?://[^\s<>"]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s<>"]*)?'
    scraped_urls = re.findall(pattern, combined_desc)
    
    # 3. Combine and deduplicate
    all_urls = []
    seen = set()
    
    # Prioritize non-blocked domains (Smart Extraction)
    for url in primary_urls + scraped_urls:
        url_clean = url.split("?")[0] if "?" in url else url
        if url_clean not in seen:
            all_urls.append(url)
            seen.add(url_clean)
            
    # Re-order: Move pranjay.com (blocked) to the end of the list
    live_urls = [u for u in all_urls if "pranjay.com" not in u]
    legacy_urls = [u for u in all_urls if "pranjay.com" in u]
    
    return (live_urls + legacy_urls)[:6]  # max 6 images per product

def infer_category(name: str) -> str:
    """Guess category name from product name."""
    name_lower = name.lower()
    if any(k in name_lower for k in ["lipstick", "lip color", "lip paint", "lip crayon", "lip gloss"]):
        return "Lip Color"
    if any(k in name_lower for k in ["foundation", "concealer", "compact", "primer", "mousse"]):
        return "Face Makeup"
    if any(k in name_lower for k in ["mascara", "kajal", "eyeliner", "eye"]):
        return "Eye Makeup"
    if any(k in name_lower for k in ["bleach", "cream", "serum", "face wash", "gel", "scrub", "pack", "kit", "mist", "toner", "lotion", "cleanser"]):
        return "Skin Care"
    if any(k in name_lower for k in ["heena", "henna"]):
        return "Hair Care"
    if any(k in name_lower for k in ["hand", "nail"]):
        return "Hand Care"
    return "Beauty & Personal Care"

def infer_brand(name: str) -> str:
    """Guess brand from product name."""
    name_lower = name.lower()
    if "lakme" in name_lower or "lakmé" in name_lower or "lame" in name_lower:
        return "Lakme"
    if "shahnaz" in name_lower:
        return "Shahnaz Husain"
    if "naturance" in name_lower or "naturence" in name_lower or "naurance" in name_lower:
        return "Naturance"
    if "nature's" in name_lower or "nature s" in name_lower:
        return "Nature's"
    return "Other"

# ── Main migration ────────────────────────────────────────────────────────────

async def get_or_create_category(session: AsyncSession, name: str, slug: str) -> Category:
    result = await session.execute(select(Category).where(Category.slug == slug))
    cat = result.scalar_one_or_none()
    if not cat:
        cat = Category(name=name, slug=slug, is_active=True)
        session.add(cat)
        await session.flush()
    return cat

async def migrate():
    if not os.path.exists(CSV_PATH):
        print(f"❌ CSV file not found at: {CSV_PATH}")
        print("Please ensure the WC export CSV is in the project root directory.")
        sys.exit(1)

    print(f"📂 Reading CSV: {CSV_PATH}")

    rows = []
    with open(CSV_PATH, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Only migrate simple, published products with a price
            if row.get("Type", "").strip() == "simple" and row.get("Published", "").strip() == "1":
                rows.append(row)

    print(f"✅ Found {len(rows)} publishable simple products")

    # Category cache
    category_cache: dict[str, Category] = {}

    inserted = 0
    skipped = 0
    slug_seen: set[str] = set()

    async with async_session_maker() as session:
        # Preload existing slugs to avoid duplication
        existing = await session.execute(select(Product.slug))
        existing_slugs = {row[0] for row in existing.all()}
        print(f"ℹ️  {len(existing_slugs)} products already in DB — will skip duplicates")

        for row in rows:
            name = row.get("Name", "").strip()
            if not name:
                skipped += 1
                continue

            # Price
            regular_price_str = row.get("Regular price", "").strip()
            sale_price_str = row.get("Sale price", "").strip()
            try:
                mrp = float(regular_price_str) if regular_price_str else 0.0
                selling_price = float(sale_price_str) if sale_price_str else mrp
                if mrp == 0 and selling_price == 0:
                    skipped += 1
                    continue
                if selling_price == 0:
                    selling_price = mrp
            except ValueError:
                skipped += 1
                continue

            # B2B price = 80% of selling price (typical distributor margin)
            b2b_price = round(selling_price * 0.80, 2)

            # Slug (ensure unique)
            base_slug = slugify(name)
            slug = base_slug
            counter = 1
            while slug in existing_slugs or slug in slug_seen:
                slug = f"{base_slug}-{counter}"
                counter += 1
            slug_seen.add(slug)

            if slug in existing_slugs:
                skipped += 1
                continue

            # Description
            description = strip_html(row.get("Description", ""))
            short_description = strip_html(row.get("Short description", ""))
            if not short_description and description:
                short_description = description[:300]

            # Stock
            stock_str = row.get("Stock", "").strip()
            try:
                stock = int(float(stock_str)) if stock_str else 100
                stock = max(stock, 0)
            except ValueError:
                stock = 100

            in_stock = row.get("In stock?", "1").strip() == "1"

            # Category
            cat_name = infer_category(name)
            cat_slug = slugify(cat_name)
            if cat_slug not in category_cache:
                cat = await get_or_create_category(session, cat_name, cat_slug)
                category_cache[cat_slug] = cat
            category = category_cache[cat_slug]

            # Images (Smart Extraction)
            image_urls = extract_images(
                row.get("Images", ""), 
                row.get("Description", ""), 
                row.get("Short description", "")
            )

            # SKU from WC ID
            wc_id = row.get("ID", "").strip()
            sku = f"WC-{wc_id}" if wc_id else f"WC-{uuid.uuid4().hex[:8].upper()}"

            # Brand info in short description
            brand = infer_brand(name)

            # Featured status
            is_featured_str = row.get("Is featured?", "0").strip()
            is_featured = is_featured_str == "1" or is_featured_str.lower() == "true"

            # Create product
            product = Product(
                name=name,
                slug=slug,
                sku=sku,
                description=description or short_description or f"{name} - Quality cosmetic product.",
                short_description=short_description or f"{name}",
                mrp=mrp,
                selling_price=selling_price,
                b2b_price=b2b_price,
                stock_quantity=stock,
                min_order_quantity=1,
                unit="pcs",
                is_active=in_stock and bool(image_urls if image_urls else True),
                is_featured=is_featured,
                image_url=image_urls[0] if image_urls else None,
                category_id=category.id,
                brand_id=None,
            )
            session.add(product)
            await session.flush()  # get product ID

            # Create product images
            for idx, url in enumerate(image_urls):
                img = ProductImage(
                    product_id=product.id,
                    image_url=url,
                    alt_text=name,
                    is_primary=(idx == 0),
                    sort_order=idx,
                )
                session.add(img)

            inserted += 1

            if inserted % 50 == 0:
                await session.commit()
                print(f"  💾 Committed {inserted} products so far...")

        await session.commit()

    print(f"\n🎉 Migration complete!")
    print(f"   ✅ Inserted: {inserted} products")
    print(f"   ⏭️  Skipped:  {skipped} (no price, duplicate slug, or unpublished)")

if __name__ == "__main__":
    asyncio.run(migrate())
