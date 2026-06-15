export const FREE_DELIVERY_MIN_ORDER_VALUE = 1500;
export const STANDARD_DELIVERY_FEE = 50;

export function getPayableProductValue(subtotal: number, discount: number = 0): number {
    return Math.max(0, subtotal - discount);
}

export function getDeliveryFee(subtotal: number, discount: number = 0): number {
    return getPayableProductValue(subtotal, discount) >= FREE_DELIVERY_MIN_ORDER_VALUE
        ? 0
        : STANDARD_DELIVERY_FEE;
}

export function getFreeDeliveryShortfall(subtotal: number, discount: number = 0): number {
    return Math.max(0, FREE_DELIVERY_MIN_ORDER_VALUE - getPayableProductValue(subtotal, discount));
}
