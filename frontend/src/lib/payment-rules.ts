export const COD_ALLOWED_PIN_CODES = new Set([
    '846001',
    '846002',
    '846003',
    '846004',
    '846005',
    '846008',
    '846009',
    '847101',
    '847103',
    '847104',
    '847105',
    '847121',
    '847201',
    '847239',
    '848213',
]);

export const COD_RESTRICTED_MESSAGE =
    'Cash on delivery is available only for select PIN codes. Please use online payment for other delivery areas.';

export function normalizePinCode(postalCode: string): string {
    return postalCode.replace(/\D/g, '').slice(0, 6);
}

export function isCodAllowedForPostalCode(postalCode: string): boolean {
    const pin = normalizePinCode(postalCode);
    return pin.length === 6 && COD_ALLOWED_PIN_CODES.has(pin);
}

/** @deprecated Use isCodAllowedForPostalCode */
export function isCodAllowedForState(_state: string): boolean {
    return false;
}
