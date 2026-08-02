"""
Delete users by phone number for fresh re-registration.

Usage (from backend/):
  python scripts/delete_users_by_phone.py 8404976778 7061483898
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text
from app.database import async_session


def phone_variants(raw: str) -> list[str]:
    digits = "".join(ch for ch in raw if ch.isdigit())
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    variants = {raw.strip(), digits}
    if len(digits) == 10:
        variants.update({digits, f"+91{digits}", f"91{digits}"})
    return [v for v in variants if v]


async def delete_users_by_phone(phones: list[str]) -> None:
    all_variants: list[str] = []
    for phone in phones:
        all_variants.extend(phone_variants(phone))
    unique_variants = sorted(set(all_variants))

    async with async_session() as session:
        find_sql = text(
            "SELECT id, phone, email FROM users WHERE phone = ANY(:phones)"
        )
        result = await session.execute(find_sql, {"phones": unique_variants})
        rows = result.all()

        if not rows:
            print("No users found for:", ", ".join(phones))
            print("Tried variants:", ", ".join(unique_variants))
            return

        for user_id, phone, email in rows:
            uid = str(user_id)
            print(f"Deleting user {uid} | phone={phone} | email={email}")

            order_ids_result = await session.execute(
                text("SELECT id FROM orders WHERE user_id = :uid"),
                {"uid": uid},
            )
            order_ids = [str(row[0]) for row in order_ids_result.all()]

            if order_ids:
                await session.execute(
                    text("DELETE FROM order_items WHERE order_id = ANY(:order_ids)"),
                    {"order_ids": order_ids},
                )
                await session.execute(
                    text("DELETE FROM orders WHERE id = ANY(:order_ids)"),
                    {"order_ids": order_ids},
                )

            await session.execute(text("DELETE FROM cart_items WHERE user_id = :uid"), {"uid": uid})
            await session.execute(text("DELETE FROM wishlist_items WHERE user_id = :uid"), {"uid": uid})
            await session.execute(text("DELETE FROM addresses WHERE user_id = :uid"), {"uid": uid})
            await session.execute(text("DELETE FROM otp_codes WHERE user_id = :uid"), {"uid": uid})
            await session.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": uid})

        await session.commit()
        print(f"Deleted {len(rows)} user(s).")


if __name__ == "__main__":
    targets = sys.argv[1:] or ["8404976778", "7061483898"]
    asyncio.run(delete_users_by_phone(targets))
