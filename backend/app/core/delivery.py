"""Delivery fee rules shared by checkout and order creation."""

from decimal import Decimal


FREE_DELIVERY_MIN_ORDER_VALUE = Decimal("1500")
STANDARD_DELIVERY_FEE = Decimal("50")


def calculate_delivery_fee(subtotal: Decimal, discount_amount: Decimal = Decimal("0")) -> Decimal:
    """Return delivery fee based on payable product value after promo discount."""
    payable_product_value = max(Decimal("0"), subtotal - discount_amount)
    if payable_product_value >= FREE_DELIVERY_MIN_ORDER_VALUE:
        return Decimal("0")
    return STANDARD_DELIVERY_FEE
