"""
Fix script: Add missing columns to products table and ensure all tables exist.
Run: cd backend && source venv/bin/activate && PYTHONPATH=. python scripts/fix_db_schema.py
"""
import asyncio
import sqlite3

DB_PATH = "./data/pranjay.db"


def fix_schema():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Get existing columns
    cursor.execute("PRAGMA table_info(products)")
    product_cols = {row[1] for row in cursor.fetchall()}

    # Add missing columns to products
    missing_product_cols = {
        "image_url": "TEXT",
        "attributes": "JSON",
    }
    for col, col_type in missing_product_cols.items():
        if col not in product_cols:
            print(f"Adding column: products.{col}")
            cursor.execute(f"ALTER TABLE products ADD COLUMN {col} {col_type}")

    # Check orders table
    cursor.execute("PRAGMA table_info(orders)")
    order_cols = {row[1] for row in cursor.fetchall()}

    missing_order_cols = {
        "shipping_address_data": "TEXT",
        "gst_number": "TEXT",
    }
    for col, col_type in missing_order_cols.items():
        if col not in order_cols:
            print(f"Adding column: orders.{col}")
            cursor.execute(f"ALTER TABLE orders ADD COLUMN {col} {col_type}")

    conn.commit()
    conn.close()
    print("✅ Schema fix complete!")


fix_schema()
