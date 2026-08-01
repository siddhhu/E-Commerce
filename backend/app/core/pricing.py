"""Checkout pricing: delivery fee + bulk order discount."""

from decimal import Decimal

from app.core.delivery import calculate_delivery_fee

BULK_DISCOUNT_MIN_ORDER_VALUE = Decimal("10000")
BULK_DISCOUNT_RATE = Decimal("0.01")  # 1% off payable product value


def payable_product_value(subtotal: Decimal, promo_discount: Decimal = Decimal("0")) -> Decimal:
    return max(Decimal("0"), subtotal - promo_discount)


def calculate_bulk_discount(
    subtotal: Decimal,
    promo_discount: Decimal = Decimal("0"),
) -> Decimal:
    """Extra 1% off when payable product value is ₹10,000 or more."""
    payable = payable_product_value(subtotal, promo_discount)
    if payable < BULK_DISCOUNT_MIN_ORDER_VALUE:
        return Decimal("0")
    return (payable * BULK_DISCOUNT_RATE).quantize(Decimal("0.01"))


def calculate_checkout_amounts(
    subtotal: Decimal,
    promo_discount: Decimal = Decimal("0"),
) -> dict[str, Decimal]:
    """Returns promo, bulk, combined discount, shipping, and total."""
    promo = min(max(Decimal("0"), promo_discount), subtotal)
    bulk = calculate_bulk_discount(subtotal, promo)
    total_discount = (promo + bulk).quantize(Decimal("0.01"))
    shipping = calculate_delivery_fee(subtotal, total_discount)
    total = max(Decimal("0"), subtotal - total_discount + shipping).quantize(Decimal("0.01"))
    return {
        "promo_discount": promo,
        "bulk_discount": bulk,
        "discount_amount": total_discount,
        "shipping_amount": shipping,
        "total_amount": total,
    }
