"""
Import products from colorsqueen.com (Shopify) into Pranjay database.

Fetches the public Shopify products.json API and inserts products with images.

Usage:
    cd backend
    python -m scripts.import_colorsqueen

Options via env:
    COLORSQUEEN_BASE_URL=https://colorsqueen.com   (default)
    IMPORT_UPLOAD_IMAGES=1                         (rehost images to Supabase/local)
"""
from __future__ import annotations

import asyncio
import html
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from decimal import Decimal
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_maker, init_db, close_db
from app.models.brand import Brand
from app.models.category import Category
from app.models.product import Product, ProductImage

DEFAULT_BASE_URL = os.getenv("COLORSQUEEN_BASE_URL", "https://colorsqueen.com").rstrip("/")
UPLOAD_IMAGES = os.getenv("IMPORT_UPLOAD_IMAGES", "").strip() in {"1", "true", "yes"}
MAX_IMAGES_PER_PRODUCT = 6
BRAND_NAME = "Colors Queen"
BRAND_SLUG = "colors-queen"


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text[:80]


def strip_html(text: str) -> str:
    if not text:
        return ""
    clean = re.sub(r"<[^>]+>", " ", text)
    clean = html.unescape(clean)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean[:2000]


def infer_category(name: str, product_type: str = "", tags: list[str] | None = None) -> str:
    combined = " ".join([name, product_type, " ".join(tags or [])]).lower()
    if any(k in combined for k in ["lipstick", "lip color", "lip paint", "lip crayon", "lip gloss", "lip"]):
        return "Lip Color"
    if any(k in combined for k in ["foundation", "concealer", "compact", "primer", "mousse", "face"]):
        return "Face Makeup"
    if any(k in combined for k in ["mascara", "kajal", "eyeliner", "eye", "brow"]):
        return "Eye Makeup"
    if any(k in combined for k in ["nail", "cuticle", "manicure"]):
        return "Nail Care"
    if any(k in combined for k in ["hair", "heena", "henna", "shampoo", "conditioner"]):
        return "Hair Care"
    if any(k in combined for k in ["bleach", "cream", "serum", "face wash", "gel", "scrub", "pack", "kit", "mist", "toner", "lotion", "cleanser", "skin"]):
        return "Skin Care"
    if any(k in combined for k in ["hand", "body"]):
        return "Hand & Body Care"
    return "Beauty & Personal Care"


async def fetch_all_shopify_products(base_url: str) -> list[dict[str, Any]]:
    products: list[dict[str, Any]] = []
    page = 1

    while True:
        query = urllib.parse.urlencode({"limit": 250, "page": page})
        request = urllib.request.Request(
            f"{base_url}/products.json?{query}",
            headers={"User-Agent": "PranjayImport/1.0"},
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            batch = json.loads(response.read().decode("utf-8")).get("products", [])
        if not batch:
            break
        products.extend(batch)
        print(f"  fetched page {page}: {len(batch)} products")
        page += 1

    return products


async def get_or_create_category(session: AsyncSession, name: str) -> Category:
    slug = slugify(name)
    result = await session.execute(select(Category).where(Category.slug == slug))
    category = result.scalar_one_or_none()
    if category:
        return category

    category = Category(name=name, slug=slug, is_active=True)
    session.add(category)
    await session.flush()
    return category


async def get_or_create_brand(session: AsyncSession) -> Brand:
    result = await session.execute(select(Brand).where(Brand.slug == BRAND_SLUG))
    brand = result.scalar_one_or_none()
    if brand:
        return brand

    brand = Brand(
        name=BRAND_NAME,
        slug=BRAND_SLUG,
        description="Colors Queen cosmetics and beauty products",
        is_active=True,
    )
    session.add(brand)
    await session.flush()
    return brand


async def resolve_image_url(url: str) -> str:
    if not UPLOAD_IMAGES:
        return url
    from app.services.storage_service import storage_service

    uploaded = await storage_service.upload_from_url(url)
    return uploaded or url


async def import_products() -> None:
    print(f"🛍️  Importing products from {DEFAULT_BASE_URL}")
    print(f"   Image upload to storage: {'enabled' if UPLOAD_IMAGES else 'disabled (using Shopify CDN URLs)'}")

    await init_db()

    print("\n📥 Fetching Shopify catalog...")
    shopify_products = await fetch_all_shopify_products(DEFAULT_BASE_URL)
    print(f"✅ Found {len(shopify_products)} products on source site")

    inserted = 0
    skipped = 0
    updated_images = 0

    async with async_session_maker() as session:
        brand = await get_or_create_brand(session)
        category_cache: dict[str, Category] = {}

        existing_slugs = {
            row[0]
            for row in (await session.execute(select(Product.slug))).all()
        }
        existing_skus = {
            row[0]
            for row in (await session.execute(select(Product.sku))).all()
            if row[0]
        }

        for item in shopify_products:
            title = (item.get("title") or "").strip()
            if not title:
                skipped += 1
                continue

            variants = item.get("variants") or []
            primary_variant = variants[0] if variants else {}
            try:
                selling_price = Decimal(str(primary_variant.get("price") or "0"))
                compare_at = primary_variant.get("compare_at_price")
                mrp = Decimal(str(compare_at)) if compare_at else selling_price
                if selling_price <= 0:
                    skipped += 1
                    continue
                if mrp < selling_price:
                    mrp = selling_price
            except Exception:
                skipped += 1
                continue

            handle = (item.get("handle") or slugify(title)).strip()
            base_slug = f"cq-{handle}"[:80]
            slug = base_slug
            counter = 1
            while slug in existing_slugs:
                slug = f"{base_slug}-{counter}"[:80]
                counter += 1

            sku = (primary_variant.get("sku") or "").strip()
            if not sku:
                sku = f"CQ-{item.get('id')}"
            if sku in existing_skus:
                skipped += 1
                continue

            description = strip_html(item.get("body_html") or "")
            short_description = description[:300] if description else title

            cat_name = infer_category(
                title,
                item.get("product_type") or "",
                item.get("tags") or [],
            )
            if cat_name not in category_cache:
                category_cache[cat_name] = await get_or_create_category(session, cat_name)
            category = category_cache[cat_name]

            image_urls = [
                img.get("src")
                for img in (item.get("images") or [])
                if img.get("src")
            ][:MAX_IMAGES_PER_PRODUCT]

            if not image_urls:
                skipped += 1
                continue

            b2b_price = round(float(selling_price) * 0.80, 2)
            available = any(v.get("available") for v in variants) if variants else True
            stock_quantity = 100 if available else 0

            primary_image = await resolve_image_url(image_urls[0])
            if primary_image != image_urls[0]:
                updated_images += 1

            product = Product(
                name=title,
                slug=slug,
                sku=sku,
                description=description or short_description,
                short_description=short_description,
                mrp=mrp,
                selling_price=selling_price,
                b2b_price=b2b_price,
                stock_quantity=stock_quantity,
                min_order_quantity=1,
                unit="pcs",
                is_active=available,
                is_featured=False,
                image_url=primary_image,
                category_id=category.id,
                brand_id=brand.id,
                seller_name=BRAND_NAME,
            )
            session.add(product)
            await session.flush()

            for idx, url in enumerate(image_urls):
                final_url = primary_image if idx == 0 else await resolve_image_url(url)
                if final_url != url:
                    updated_images += 1
                session.add(
                    ProductImage(
                        product_id=product.id,
                        image_url=final_url,
                        alt_text=title,
                        is_primary=(idx == 0),
                        sort_order=idx,
                    )
                )

            existing_slugs.add(slug)
            existing_skus.add(sku)
            inserted += 1

            if inserted % 25 == 0:
                await session.commit()
                print(f"  💾 Committed {inserted} products...")

        await session.commit()

    await close_db()

    print("\n🎉 Import complete!")
    print(f"   ✅ Inserted: {inserted}")
    print(f"   ⏭️  Skipped:  {skipped}")
    if UPLOAD_IMAGES:
        print(f"   🖼️  Images uploaded: {updated_images}")


if __name__ == "__main__":
    asyncio.run(import_products())
