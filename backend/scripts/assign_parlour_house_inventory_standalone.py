#!/usr/bin/env python3
"""
One-time DB migration: assign Colors Queen / legacy inventory to Parlour House seller.
Uses DATABASE_URL from backend/.env — no FastAPI dependency.
"""
import asyncio
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlparse, unquote

from dotenv import load_dotenv

try:
    import asyncpg
except ImportError:
    print("asyncpg not installed. Run: pip install asyncpg python-dotenv", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

LEGACY_SELLER_NAMES = (
    "Colors Queen", "colors queen", "COLORS QUEEN",
    "Mahaganpati", "Pranjay",
)

PARLOUR_TERMS = (
    "%parlour house%", "%parlour%", "%parlor house%", "%parlor%",
    "%parlar house%", "%parlar%",
)


def database_url_to_asyncpg(url: str) -> str:
    """Convert sqlalchemy async URL to asyncpg DSN."""
    url = url.replace("postgresql+asyncpg://", "postgresql://")
    url = url.replace("postgres+asyncpg://", "postgresql://")
    return url


async def find_parlour_house_user(conn: asyncpg.Connection) -> asyncpg.Record:
    row = await conn.fetchrow(
        """
        SELECT id, email, full_name, business_name
        FROM users
        WHERE user_type = 'seller'
          AND seller_status = 'approved'
          AND (
            LOWER(COALESCE(business_name, '')) LIKE ANY($1::text[])
            OR LOWER(COALESCE(full_name, '')) LIKE ANY($1::text[])
            OR LOWER(COALESCE(email, '')) LIKE ANY($1::text[])
          )
        ORDER BY created_at ASC
        LIMIT 1
        """,
        list(PARLOUR_TERMS),
    )
    if not row:
        raise SystemExit(
            "ERROR: Parlour House seller account not found. "
            "Need an approved seller with business_name containing 'Parlour House'."
        )
    return row


async def main() -> None:
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise SystemExit("ERROR: DATABASE_URL not set in backend/.env")

    dsn = database_url_to_asyncpg(db_url)
    print("Connecting to database…")

    conn = await asyncpg.connect(dsn, statement_cache_size=0)
    try:
        seller = await find_parlour_house_user(conn)
        seller_id = seller["id"]
        seller_label = seller["business_name"] or seller["full_name"] or "PARLOUR HOUSE"
        print(f"Parlour House seller: {seller_label} ({seller['email']})")

        product_ids = await conn.fetch(
            """
            SELECT id, seller_name FROM products
            WHERE LOWER(COALESCE(seller_name, '')) LIKE '%colors queen%'
               OR seller_name = ANY($1::text[])
            """,
            list(LEGACY_SELLER_NAMES),
        )

        category_ids = await conn.fetch(
            """
            SELECT id, seller_name FROM categories
            WHERE LOWER(COALESCE(seller_name, '')) LIKE '%colors queen%'
               OR seller_name = ANY($1::text[])
            """,
            list(LEGACY_SELLER_NAMES),
        )

        if not product_ids and not category_ids:
            print("Nothing to update — inventory already assigned to Parlour House.")
            return

        print(f"Products to reassign: {len(product_ids)}")
        for row in product_ids[:5]:
            print(f"  · {row['id']} (was: {row['seller_name']})")
        if len(product_ids) > 5:
            print(f"  … and {len(product_ids) - 5} more")

        print(f"Categories to reassign: {len(category_ids)}")

        async with conn.transaction():
            if product_ids:
                await conn.execute(
                    """
                    UPDATE products
                    SET seller_id = $1, seller_name = $2
                    WHERE LOWER(COALESCE(seller_name, '')) LIKE '%colors queen%'
                       OR seller_name = ANY($3::text[])
                    """,
                    seller_id,
                    seller_label,
                    list(LEGACY_SELLER_NAMES),
                )
            if category_ids:
                await conn.execute(
                    """
                    UPDATE categories
                    SET seller_id = $1, seller_name = $2
                    WHERE LOWER(COALESCE(seller_name, '')) LIKE '%colors queen%'
                       OR seller_name = ANY($3::text[])
                    """,
                    seller_id,
                    seller_label,
                    list(LEGACY_SELLER_NAMES),
                )

        print("Done.")
        print(f"  products_updated: {len(product_ids)}")
        print(f"  categories_updated: {len(category_ids)}")
        print(f"  seller_name: {seller_label}")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
