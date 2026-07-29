"""Shared seller display name for admin / imported catalog products."""

SELLER_DISPLAY_NAME = "PARLOUR HOUSE"
LEGACY_SELLER_NAMES = frozenset({"Colors Queen", "Mahaganpati", "Pranjay"})


def normalize_seller_name(name: str | None) -> str:
    if not name or name in LEGACY_SELLER_NAMES:
        return SELLER_DISPLAY_NAME
    return name
