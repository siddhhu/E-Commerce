"""
Pranjay Backend - FastAPI Application Entry Point
"""
import os
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import close_db, init_db
from app.routers import auth, banners, cart, categories, checkout, orders, products, users, wishlist
# from app.routers.admin import banners as admin_banners, bulk_upload, dashboard, migrate_images
from app.routers.admin import banners as admin_banners, bulk_upload, dashboard
from app.routers.admin import orders as admin_orders
from app.routers.admin import products as admin_products
from app.routers.admin import users as admin_users


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    # Tables are now managed by Alembic in startCommand
    yield
    # Shutdown
    await close_db()


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="B2B Cosmetics Ecommerce Platform API",
    version=settings.api_version,
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Local uploads (used when Supabase is not configured)
uploads_dir = Path(os.getenv("UPLOADS_DIR", "uploads"))
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

# Global exception handler — ensures CORS headers are present even on unhandled 500s
# Without this, Vercel can intercept crashes and return raw 500s with no CORS headers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again."},
    )

# API Router prefix
API_PREFIX = f"/api/{settings.api_version}"

# Public Routes
app.include_router(auth.router, prefix=f"{API_PREFIX}/auth", tags=["Authentication"])
app.include_router(users.router, prefix=f"{API_PREFIX}/users", tags=["Users"])
app.include_router(products.router, prefix=f"{API_PREFIX}/products", tags=["Products"])
app.include_router(categories.router, prefix=f"{API_PREFIX}/categories", tags=["Categories"])
app.include_router(cart.router, prefix=f"{API_PREFIX}/cart", tags=["Cart"])
app.include_router(wishlist.router, prefix=f"{API_PREFIX}/wishlist", tags=["Wishlist"])
app.include_router(checkout.router, prefix=f"{API_PREFIX}/checkout", tags=["Checkout"])
app.include_router(orders.router, prefix=f"{API_PREFIX}/orders", tags=["Orders"])
app.include_router(banners.router, prefix=f"{API_PREFIX}/banners", tags=["Banners"])

# Admin Routes
app.include_router(
    dashboard.router, prefix=f"{API_PREFIX}/admin", tags=["Admin - Dashboard"]
)
app.include_router(
    admin_products.router, prefix=f"{API_PREFIX}/admin/products", tags=["Admin - Products"]
)
app.include_router(
    admin_orders.router, prefix=f"{API_PREFIX}/admin/orders", tags=["Admin - Orders"]
)
app.include_router(
    admin_users.router, prefix=f"{API_PREFIX}/admin/users", tags=["Admin - Users"]
)
app.include_router(
    bulk_upload.router, prefix=f"{API_PREFIX}/admin/bulk-upload", tags=["Admin - Bulk Upload"]
)
app.include_router(
    admin_banners.router, prefix=f"{API_PREFIX}/admin/banners", tags=["Admin - Banners"]
)
# app.include_router(
#     migrate_images.router, prefix=f"{API_PREFIX}/admin/migrate", tags=["Admin - Migration"]
# )


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": settings.app_name,
        "version": settings.api_version,
        "status": "running",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
