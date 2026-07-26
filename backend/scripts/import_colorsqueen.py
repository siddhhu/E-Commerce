"""
Import products from colorsqueen.com (Shopify) into Pranjay database.

Fetches the public Shopify products.json API and inserts products with images.
When IMPORT_VARIANTS=1 (default), each color/shade variant becomes its own product.

Usage:
    cd backend
    python -m scripts.import_colorsqueen

Options via env:
    COLORSQUEEN_BASE_URL=https://colorsqueen.com   (default)
    IMPORT_VARIANTS=1                              split multi-shade products (default: on)
    IMPORT_UPLOAD_IMAGES=1                         rehost images to Supabase/local
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
from dataclasses import dataclass
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
IMPORT_VARIANTS = os.getenv("IMPORT_VARIANTS", "1").strip() not in {"0", "false", "no"}
MAX_IMAGES_PER_PRODUCT = 6
BRAND_NAME = "Colors Queen"
BRAND_SLUG = "colors-queen"


@dataclass
class ImportRow:
    shopify_product_id: int
    shopify_variant_id: int
    title: str
    slug: str
    sku: str
    description: str
    short_description: str
    mrp: Decimal
    selling_price: Decimal
    b2b_price: Decimal
    stock_quantity: int
    is_active: bool
    image_urls: list[str]
    category_name: str


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


def variant_image_urls(item: dict[str, Any], variant: dict[str, Any]) -> list[str]:
    urls: list[str] = []
    seen: set[str] = set()

    featured = variant.get("featured_image")
    if isinstance(featured, dict) and featured.get("src"):
        urls.append(featured["src"])
        seen.add(featured["src"])

    variant_id = variant.get("id")
    for image in item.get("images") or []:
        src = image.get("src")
        if not src or src in seen:
            continue
        variant_ids = image.get("variant_ids") or []
        if not variant_ids or variant_id in variant_ids:
            urls.append(src)
            seen.add(src)

    if not urls:
        for image in item.get("images") or []:
            src = image.get("src")
            if src and src not in seen:
                urls.append(src)
                seen.add(src)

    return urls[:MAX_IMAGES_PER_PRODUCT]


def build_import_rows(item: dict[str, Any]) -> list[ImportRow]:
    title = (item.get("title") or "").strip()
    if not title:
        return []

    handle = (item.get("handle") or slugify(title)).strip()
    description = strip_html(item.get("body_html") or "")
    short_description = description[:300] if description else title
    category_name = infer_category(title, item.get("product_type") or "", item.get("tags") or [])
    variants = item.get("variants") or []

    if not variants:
        variants = [{}]

    rows: list[ImportRow] = []
    multi_variant = IMPORT_VARIANTS and len(variants) > 1 and any(
        (v.get("title") or "").strip().lower() != "default title" for v in variants
    )

    for variant in variants if multi_variant else variants[:1]:
        variant_title = (variant.get("title") or "Default Title").strip()
        display_title = title if variant_title.lower() == "default title" else f"{title} - {variant_title}"

        try:
            selling_price = Decimal(str(variant.get("price") or "0"))
            compare_at = variant.get("compare_at_price")
            mrp = Decimal(str(compare_at)) if compare_at else selling_price
            if selling_price <= 0:
                continue
            if mrp < selling_price:
                mrp = selling_price
        except Exception:
            continue

        variant_slug_part = slugify(variant_title) if variant_title.lower() != "default title" else ""
        base_slug = f"cq-{handle}"[:70]
        slug = f"{base_slug}-{variant_slug_part}"[:80] if variant_slug_part else base_slug[:80]

        variant_id = variant.get("id") or item.get("id")
        sku = (variant.get("sku") or "").strip()
        if not sku:
            sku = f"CQ-{item.get('id')}-{variant_id}"

        image_urls = variant_image_urls(item, variant)
        if not image_urls:
            continue

        available = variant.get("available", True)
        rows.append(
            ImportRow(
                shopify_product_id=int(item.get("id") or 0),
                shopify_variant_id=int(variant_id or 0),
                title=display_title,
                slug=slug,
                sku=sku,
                description=description or short_description,
                short_description=short_description,
                mrp=mrp,
                selling_price=selling_price,
                b2b_price=Decimal(str(round(float(selling_price) * 0.80, 2))),
                stock_quantity=100 if available else 0,
                is_active=bool(available),
                image_urls=image_urls,
                category_name=category_name,
            )
        )

    return rows


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


def ensure_unique_slug(slug: str, existing_slugs: set[str]) -> str:
    if slug not in existing_slugs:
        return slug
    counter = 1
    while True:
        candidate = f"{slug}-{counter}"[:80]
        if candidate not in existing_slugs:
            return candidate
        counter += 1


def ensure_unique_sku(sku: str, variant_id: int, existing_skus: set[str]) -> str:
    if sku not in existing_skus:
        return sku
    candidate = f"{sku}-V{variant_id}"[:100]
    if candidate not in existing_skus:
        return candidate
    counter = 1
    while True:
        candidate = f"{sku}-V{variant_id}-{counter}"[:100]
        if candidate not in existing_skus:
            return candidate
        counter += 1


async def import_products() -> None:
    print(f"🛍️  Importing products from {DEFAULT_BASE_URL}")
    print(f"   Variant split: {'enabled' if IMPORT_VARIANTS else 'disabled'}")
    print(f"   Image upload to storage: {'enabled' if UPLOAD_IMAGES else 'disabled (using Shopify CDN URLs)'}")

    await init_db()

    print("\n📥 Fetching Shopify catalog...")
    shopify_products = await fetch_all_shopify_products(DEFAULT_BASE_URL)
    print(f"✅ Found {len(shopify_products)} parent products on source site")

    all_rows: list[ImportRow] = []
    for item in shopify_products:
        all_rows.extend(build_import_rows(item))
    print(f"📦 Prepared {len(all_rows)} import rows (including shade/size variants)")

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

        for row in all_rows:
            slug = ensure_unique_slug(row.slug, existing_slugs)
            if slug in existing_slugs:
                skipped += 1
                continue

            sku = ensure_unique_sku(row.sku, row.shopify_variant_id, existing_skus)
            if sku in existing_skus:
                skipped += 1
                continue

            if row.category_name not in category_cache:
                category_cache[row.category_name] = await get_or_create_category(session, row.category_name)
            category = category_cache[row.category_name]

            primary_image = await resolve_image_url(row.image_urls[0])
            if primary_image != row.image_urls[0]:
                updated_images += 1

            product = Product(
                name=row.title,
                slug=slug,
                sku=sku,
                description=row.description,
                short_description=row.short_description,
                mrp=row.mrp,
                selling_price=row.selling_price,
                b2b_price=row.b2b_price,
                stock_quantity=row.stock_quantity,
                min_order_quantity=1,
                unit="pcs",
                is_active=row.is_active,
                is_featured=False,
                image_url=primary_image,
                category_id=category.id,
                brand_id=brand.id,
                seller_name=BRAND_NAME,
            )
            session.add(product)
            await session.flush()

            for idx, url in enumerate(row.image_urls):
                final_url = primary_image if idx == 0 else await resolve_image_url(url)
                if final_url != url:
                    updated_images += 1
                session.add(
                    ProductImage(
                        product_id=product.id,
                        image_url=final_url,
                        alt_text=row.title,
                        is_primary=(idx == 0),
                        sort_order=idx,
                    )
                )

            existing_slugs.add(slug)
            existing_skus.add(sku)
            inserted += 1

            if inserted % 50 == 0:
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
