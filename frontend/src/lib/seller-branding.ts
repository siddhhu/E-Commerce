export const SELLER_DISPLAY_NAME = 'PARLOUR HOUSE';

const LEGACY_SELLER_NAMES = new Set(['Colors Queen', 'Mahaganpati', 'Pranjay']);

export function displaySellerName(name?: string | null): string {
    if (!name || LEGACY_SELLER_NAMES.has(name)) {
        return SELLER_DISPLAY_NAME;
    }
    return name;
}
