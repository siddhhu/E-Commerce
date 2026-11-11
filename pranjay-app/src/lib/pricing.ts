/**
 * Pricing rules mirrored from backend/app/core/pricing.py.
 * Prices are GST-inclusive; delivery is added separately.
 */

export const FREE_DELIVERY_MIN_ORDER_VALUE = 1000;
export const STANDARD_DELIVERY_FEE = 50;
export const BULK_DISCOUNT_MIN_ORDER_VALUE = 10_000;
export const BULK_DISCOUNT_PERCENT = 1;

export const SHOPPING_OFFERS = {
    freeDeliveryFrom: FREE_DELIVERY_MIN_ORDER_VALUE,
    deliveryFee: STANDARD_DELIVERY_FEE,
    bulkDiscountFrom: BULK_DISCOUNT_MIN_ORDER_VALUE,
    bulkDiscountPercent: BULK_DISCOUNT_PERCENT,
} as const;

/** COD is only available for these PIN codes (backend allowlist). */
export const COD_ALLOWED_PIN_CODES = new Set([
    '846001', '846002', '846003', '846004', '846005', '846008', '846009',
    '847101', '847103', '847104', '847105', '847121', '847201', '847239', '848213',
]);

export const COD_RESTRICTED_MESSAGE =
    'Cash on delivery is available only for select PIN codes. Please use online payment for other delivery areas.';

export function normalizePinCode(postalCode: string): string {
    return (postalCode || '').replace(/\D/g, '').slice(0, 6);
}

export function isCodAllowed(postalCode: string): boolean {
    const pin = normalizePinCode(postalCode);
    return pin.length === 6 && COD_ALLOWED_PIN_CODES.has(pin);
}

export function clampPromoDiscount(subtotal: number, promoDiscount: number): number {
    if (!Number.isFinite(promoDiscount) || promoDiscount <= 0) return 0;
    return Math.min(promoDiscount, Math.max(0, subtotal));
}

export function getBulkDiscount(subtotal: number, promoDiscount = 0): number {
    const payable = Math.max(0, subtotal - clampPromoDiscount(subtotal, promoDiscount));
    if (payable < BULK_DISCOUNT_MIN_ORDER_VALUE) return 0;
    return Math.round(payable * (BULK_DISCOUNT_PERCENT / 100) * 100) / 100;
}

export function getDeliveryFee(subtotal: number, discountAmount = 0): number {
    const payable = Math.max(0, subtotal - discountAmount);
    return payable >= FREE_DELIVERY_MIN_ORDER_VALUE ? 0 : STANDARD_DELIVERY_FEE;
}

export function getFreeDeliveryShortfall(subtotal: number, discountAmount = 0): number {
    const payable = Math.max(0, subtotal - discountAmount);
    return Math.max(0, FREE_DELIVERY_MIN_ORDER_VALUE - payable);
}

export function getBulkDiscountShortfall(subtotal: number, promoDiscount = 0): number {
    const payable = Math.max(0, subtotal - clampPromoDiscount(subtotal, promoDiscount));
    return Math.max(0, BULK_DISCOUNT_MIN_ORDER_VALUE - payable);
}

export interface OrderTotals {
    subtotal: number;
    promoDiscount: number;
    bulkDiscount: number;
    discount: number;
    deliveryFee: number;
    total: number;
    freeDeliveryShortfall: number;
    bulkShortfall: number;
}

export function computeTotals(subtotal: number, promoDiscount = 0): OrderTotals {
    const safeSubtotal = Math.max(0, Number(subtotal) || 0);
    const promoDiscountValue = clampPromoDiscount(safeSubtotal, Number(promoDiscount) || 0);
    const bulkDiscount = getBulkDiscount(safeSubtotal, promoDiscountValue);
    const discount = Math.round((promoDiscountValue + bulkDiscount) * 100) / 100;
    const deliveryFee = getDeliveryFee(safeSubtotal, discount);

    return {
        subtotal: safeSubtotal,
        promoDiscount: promoDiscountValue,
        bulkDiscount,
        discount,
        deliveryFee,
        total: Math.max(0, Math.round((safeSubtotal - discount + deliveryFee) * 100) / 100),
        freeDeliveryShortfall: getFreeDeliveryShortfall(safeSubtotal, discount),
        bulkShortfall: getBulkDiscountShortfall(safeSubtotal, promoDiscountValue),
    };
}
