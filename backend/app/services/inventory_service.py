"""Reassign imported / legacy catalog inventory to the Parlour House seller account."""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import func, or_, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.cache import response_cache
from app.core.exceptions import NotFoundException
from app.core.seller_branding import LEGACY_SELLER_NAMES, SELLER_DISPLAY_NAME
from app.models.category import Category
from app.models.product import Product
from app.models.user import User

PARLOUR_MATCH_TERMS = (
    "parlour house", "parlour", "parlor house", "parlor",
    "parlar house", "parlar",  # common typo in DB
)


async def find_parlour_house_user(session: AsyncSession) -> User:
    """Locate the approved Parlour House seller account."""
    conditions = []
    for term in PARLOUR_MATCH_TERMS:
        pattern = f"%{term}%"
        conditions.extend([
            func.lower(User.business_name).like(pattern),
            func.lower(User.full_name).like(pattern),
            func.lower(User.email).like(pattern),
        ])

    result = await session.execute(
        select(User)
        .where(User.user_type == "seller")
        .where(User.seller_status == "approved")
        .where(or_(*conditions))
        .order_by(User.created_at.asc())
    )
    user = result.scalars().first()
    if not user:
        raise NotFoundException(
            "Parlour House seller account not found. "
            "Ensure an approved seller user exists with business name 'Parlour House'."
        )
    return user


async def assign_legacy_inventory_to_parlour_house(
    session: AsyncSession,
    *,
    parlour_user: Optional[User] = None,
) -> dict:
    """
    Move Colors Queen / legacy Pranjay-tagged inventory onto the Parlour House seller.
    Idempotent — safe to run more than once.
    """
    seller = parlour_user or await find_parlour_house_user(session)
    seller_label = seller.business_name or seller.full_name or SELLER_DISPLAY_NAME

    legacy_names = tuple(LEGACY_SELLER_NAMES | {"Colors Queen", "colors queen", "COLORS QUEEN"})

    product_filter = or_(
        func.lower(Product.seller_name).like("%colors queen%"),
        Product.seller_name.in_(legacy_names),
    )

    product_result = await session.execute(
        select(Product.id).where(product_filter)
    )
    product_ids = [row[0] for row in product_result.all()]

    if product_ids:
        await session.execute(
            update(Product)
            .where(Product.id.in_(product_ids))
            .values(seller_id=seller.id, seller_name=seller_label)
        )

    category_filter = or_(
        func.lower(Category.seller_name).like("%colors queen%"),
        Category.seller_name.in_(legacy_names),
    )
    category_result = await session.execute(
        select(Category.id).where(category_filter)
    )
    category_ids = [row[0] for row in category_result.all()]

    if category_ids:
        await session.execute(
            update(Category)
            .where(Category.id.in_(category_ids))
            .values(seller_id=seller.id, seller_name=seller_label)
        )

    await session.commit()

    for prefix in (
        "products_list",
        "products_featured",
        "products_discounted_featured",
        "products_brands",
        "products_search_index",
        "catalog_bootstrap",
        "product_detail_bundle",
        "product_slug",
        "home_bootstrap",
        "categories_list",
        "categories_tree",
        "categories_slug",
    ):
        response_cache.clear_prefix(prefix)

    if not product_ids and not category_ids:
        return {
            "seller_id": str(seller.id),
            "seller_name": seller_label,
            "products_updated": 0,
            "categories_updated": 0,
            "message": "All inventory is already assigned to Parlour House.",
        }

    return {
        "seller_id": str(seller.id),
        "seller_name": seller_label,
        "products_updated": len(product_ids),
        "categories_updated": len(category_ids),
    }
