#!/usr/bin/env python3
"""List approved sellers (for migration setup)."""
import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
import asyncpg

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")


async def main():
    url = os.getenv("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(url, statement_cache_size=0)
    try:
        rows = await conn.fetch(
            """
            SELECT id, email, full_name, business_name, seller_status, user_type, role
            FROM users
            WHERE user_type = 'seller' OR seller_status IS NOT NULL
            ORDER BY created_at
            """
        )
        print(f"Found {len(rows)} seller-related users:")
        for r in rows:
            print(
                f"  id={r['id']} | {r['email']} | "
                f"business={r['business_name']!r} | name={r['full_name']!r} | "
                f"status={r['seller_status']} | type={r['user_type']} | role={r['role']}"
            )

        cq = await conn.fetchval(
            "SELECT COUNT(*) FROM products WHERE LOWER(seller_name) LIKE '%colors queen%'"
        )
        pr = await conn.fetchval(
            "SELECT COUNT(*) FROM products WHERE seller_name IN ('Pranjay', 'Mahaganpati')"
        )
        print(f"\nProducts with Colors Queen: {cq}")
        print(f"Products with Pranjay/Mahaganpati: {pr}")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
