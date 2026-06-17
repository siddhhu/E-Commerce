"""
Pranjay Backend - Database Configuration
"""
import os
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

from app.config import settings

# Ensure we use the async driver
db_url = settings.database_url
if db_url:
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)

# Build connection args
connect_args = {}
if "sqlite" in db_url:
    connect_args = {"check_same_thread": False}
elif "postgresql" in db_url:
    import ssl
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    connect_args = {
        "ssl": ssl_context,
        "statement_cache_size": 0,  # Required for Supabase pgBouncer pooler (port 6543)
        "command_timeout": 60,
    }

# Detect serverless environment (Vercel sets the VERCEL env var)
is_serverless = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))

if is_serverless and "postgresql" in db_url:
    # Vercel serverless functions are stateless — persistent connection pools cause
    # "connection already closed" errors. NullPool opens/closes a connection per request.
    #
    # CRITICAL: Vercel cannot open direct TCP connections to Supabase port 5432.
    # Must use the Supabase Transaction Pooler on port 6543 instead.
    # Auto-swap port 5432 → 6543 (Supabase pgBouncer transaction pooler).
    if ":5432/" in db_url:
        db_url = db_url.replace(":5432/", ":6543/")
        print("Database: Serverless detected — switched to Supabase pooler (port 6543)")

    from sqlalchemy.pool import NullPool
    engine = create_async_engine(
        db_url,
        echo=False,
        future=True,
        poolclass=NullPool,
        connect_args=connect_args,
    )
else:
    engine = create_async_engine(
        db_url,
        echo=settings.debug,
        future=True,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        pool_recycle=300,
        connect_args=connect_args,
    )

# Create async session factory
async_session_maker = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Alias for seed scripts
async_session = async_session_maker


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get database session."""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database tables with retries."""
    import asyncio
    max_retries = 3
    retry_delay = 2

    for attempt in range(max_retries):
        print(f"Database: Initializing tables (Attempt {attempt + 1}/{max_retries})...")
        try:
            async with engine.begin() as conn:
                await conn.run_sync(SQLModel.metadata.create_all)
            print("Database: Initialization complete.")
            return
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"Database: Initializing attempt {attempt + 1} failed: {e}. Retrying in {retry_delay}s...")
                await asyncio.sleep(retry_delay)
            else:
                print(f"Database: Initializing failed after {max_retries} attempts: {e}")
                raise e


async def run_startup_migrations() -> None:
    """Run schema migrations on startup to support Vercel serverless environment."""
    import asyncio
    
    async def run_migrations_impl() -> None:
        import sqlalchemy as sa
        from sqlmodel import SQLModel

        # 1. Initialize tables first
        await init_db()

        # 2. Run schema updates for Category model
        print("Database: Running category attribution schema migrations...")
        async with engine.connect() as conn:
            conn = await conn.execution_options(isolation_level="AUTOCOMMIT")
            if "sqlite" in db_url:
                try:
                    await conn.execute(sa.text("ALTER TABLE categories ADD COLUMN seller_id CHAR(32);"))
                except Exception:
                    pass
                try:
                    await conn.execute(sa.text("ALTER TABLE categories ADD COLUMN seller_name VARCHAR(255) DEFAULT 'Pranjay';"))
                except Exception:
                    pass
            else:
                await conn.execute(sa.text("ALTER TABLE categories ADD COLUMN IF NOT EXISTS seller_id UUID;"))
                await conn.execute(sa.text("ALTER TABLE categories ADD COLUMN IF NOT EXISTS seller_name VARCHAR(255) DEFAULT 'Pranjay';"))
                try:
                    await conn.execute(sa.text(
                        "ALTER TABLE categories ADD CONSTRAINT fk_categories_seller_id_users "
                        "FOREIGN KEY (seller_id) REFERENCES users (id);"
                    ))
                except Exception:
                    pass
        # 3. Run schema updates for Product model
        print("Database: Running product schema migrations...")
        async with engine.connect() as conn:
            conn = await conn.execution_options(isolation_level="AUTOCOMMIT")
            if "sqlite" in db_url:
                try:
                    await conn.execute(sa.text("ALTER TABLE products ADD COLUMN gst_percentage INTEGER DEFAULT 18;"))
                except Exception:
                    pass
                try:
                    await conn.execute(sa.text("ALTER TABLE products ADD COLUMN parent_id CHAR(32) REFERENCES products(id);"))
                except Exception:
                    pass
                try:
                    await conn.execute(sa.text("ALTER TABLE products ADD COLUMN category_ids JSON DEFAULT '[]';"))
                except Exception:
                    pass
                try:
                    await conn.execute(sa.text("UPDATE products SET category_ids = '[]' WHERE category_ids IS NULL;"))
                except Exception:
                    pass
            else:
                await conn.execute(sa.text("ALTER TABLE products ADD COLUMN IF NOT EXISTS gst_percentage INTEGER DEFAULT 18;"))
                await conn.execute(sa.text("ALTER TABLE products ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES products(id);"))
                await conn.execute(sa.text("ALTER TABLE products ADD COLUMN IF NOT EXISTS category_ids JSONB DEFAULT '[]'::jsonb;"))
                await conn.execute(sa.text("UPDATE products SET category_ids = '[]'::jsonb WHERE category_ids IS NULL;"))

        # 4. Performance indexes — idempotent (CREATE INDEX IF NOT EXISTS)
        print("Database: Running seller bank detail schema migrations...")
        async with engine.connect() as conn:
            conn = await conn.execution_options(isolation_level="AUTOCOMMIT")
            if "sqlite" in db_url:
                for sql in [
                    "ALTER TABLE users ADD COLUMN bank_account_holder_name VARCHAR(255);",
                    "ALTER TABLE users ADD COLUMN bank_account_number VARCHAR(40);",
                    "ALTER TABLE users ADD COLUMN bank_ifsc VARCHAR(11);",
                    "ALTER TABLE users ADD COLUMN bank_name VARCHAR(255);",
                    "ALTER TABLE users ADD COLUMN seller_bank_proof_url VARCHAR(1024);",
                ]:
                    try:
                        await conn.execute(sa.text(sql))
                    except Exception:
                        pass
            else:
                await conn.execute(sa.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_holder_name VARCHAR(255);"))
                await conn.execute(sa.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(40);"))
                await conn.execute(sa.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(11);"))
                await conn.execute(sa.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);"))
                await conn.execute(sa.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS seller_bank_proof_url VARCHAR(1024);"))

        print("Database: Running order item cancellation schema migrations...")
        async with engine.connect() as conn:
            conn = await conn.execution_options(isolation_level="AUTOCOMMIT")
            if "sqlite" in db_url:
                for sql in [
                    "ALTER TABLE order_items ADD COLUMN is_cancelled BOOLEAN DEFAULT 0 NOT NULL;",
                    "ALTER TABLE order_items ADD COLUMN cancelled_at DATETIME;",
                    "ALTER TABLE order_items ADD COLUMN cancellation_reason VARCHAR(500);",
                ]:
                    try:
                        await conn.execute(sa.text(sql))
                    except Exception:
                        pass
            else:
                await conn.execute(sa.text("ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN NOT NULL DEFAULT FALSE;"))
                await conn.execute(sa.text("ALTER TABLE order_items ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;"))
                await conn.execute(sa.text("ALTER TABLE order_items ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(500);"))

        # 5. Performance indexes — idempotent (CREATE INDEX IF NOT EXISTS)
        if "postgresql" in db_url:
            print("Database: Ensuring performance indexes...")
            async with engine.connect() as conn:
                conn = await conn.execution_options(isolation_level="AUTOCOMMIT")
                indexes = [
                    # Products — most filtered columns
                    "CREATE INDEX IF NOT EXISTS idx_products_is_active ON products (is_active);",
                    "CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products (is_featured) WHERE is_featured = TRUE;",
                    "CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id);",
                    "CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products (seller_id);",
                    "CREATE INDEX IF NOT EXISTS idx_products_active_featured ON products (is_active, is_featured);",
                    "CREATE INDEX IF NOT EXISTS idx_products_active_created_at ON products (is_active, created_at DESC);",
                    "CREATE INDEX IF NOT EXISTS idx_products_active_featured_created_at ON products (is_active, is_featured, created_at DESC);",
                    "CREATE INDEX IF NOT EXISTS idx_products_active_brand_created_at ON products (is_active, brand_id, created_at DESC);",
                    "CREATE INDEX IF NOT EXISTS idx_products_active_category_created_at ON products (is_active, category_id, created_at DESC);",
                    "CREATE INDEX IF NOT EXISTS idx_products_active_price ON products (is_active, selling_price);",
                    # Public homepage/filter lookups
                    "CREATE INDEX IF NOT EXISTS idx_categories_active_sort ON categories (is_active, sort_order, name);",
                    "CREATE INDEX IF NOT EXISTS idx_brands_active_name ON brands (is_active, name);",
                    "CREATE INDEX IF NOT EXISTS idx_banners_active_sort ON banners (is_active, sort_order, created_at DESC);",
                    "CREATE INDEX IF NOT EXISTS idx_promo_codes_active_expires ON promo_codes (is_active, expires_at);",
                    # Cart items — fetched on every page load when logged in
                    "CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items (user_id);",
                    # Wishlist
                    "CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id ON wishlist_items (user_id);",
                    # Orders — user history + admin filters
                    "CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);",
                    "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);",
                    "CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);",
                    "CREATE INDEX IF NOT EXISTS idx_orders_user_created_at ON orders (user_id, created_at DESC);",
                    "CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders (payment_status);",
                    # Addresses — fetched on checkout page
                    "CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses (user_id);",
                    # Order items — seller revenue queries
                    "CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);",
                    "CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items (product_id);",
                    "CREATE INDEX IF NOT EXISTS idx_order_items_order_product ON order_items (order_id, product_id);",
                ]
                for idx_sql in indexes:
                    try:
                        await conn.execute(sa.text(idx_sql))
                    except Exception as e:
                        print(f"Database: Index warning (non-fatal): {e}")
            print("Database: Performance indexes ensured.")
    try:
        # Run with a 20-second timeout so offline development doesn't hang the app startup
        await asyncio.wait_for(run_migrations_impl(), timeout=20.0)
    except asyncio.TimeoutError:
        print("Database: Startup migrations timed out (unreachable database). Skipping startup migration check...")
    except Exception as e:
        print(f"Database: Startup migrations error: {e}")


async def close_db() -> None:
    """Close database connections."""
    await engine.dispose()
