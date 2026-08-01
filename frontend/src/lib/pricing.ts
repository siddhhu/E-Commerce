export {
    FREE_DELIVERY_MIN_ORDER_VALUE,
    STANDARD_DELIVERY_FEE,
    getPayableProductValue,
    getDeliveryFee,
    getFreeDeliveryShortfall,
} from '@/lib/delivery';

export const BULK_DISCOUNT_MIN_ORDER_VALUE = 10_000;
export const BULK_DISCOUNT_PERCENT = 1;

export function getBulkDiscount(subtotal: number, promoDiscount = 0): number {
    const payable = Math.max(0, subtotal - promoDiscount);
    if (payable < BULK_DISCOUNT_MIN_ORDER_VALUE) return 0;
    return Math.round(payable * (BULK_DISCOUNT_PERCENT / 100) * 100) / 100;
}

export function getBulkDiscountShortfall(subtotal: number, promoDiscount = 0): number {
    return Math.max(0, BULK_DISCOUNT_MIN_ORDER_VALUE - Math.max(0, subtotal - promoDiscount));
}

export const SHOPPING_OFFERS = {
    freeDeliveryFrom: 3000,
    deliveryFee: 50,
    bulkDiscountFrom: 10_000,
    bulkDiscountPercent: 1,
} as const;
