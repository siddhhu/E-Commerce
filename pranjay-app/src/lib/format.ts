import { API_BASE_URL } from '@/src/config';

/**
 * Never present malformed catalogue data as a zero or negative price.  A real
 * zero-price promotion must be explicitly modelled by the API; it is not a
 * valid product price in this store.
 */
export function hasValidPrice(price: unknown): boolean {
    const value = typeof price === 'number' ? price : parseFloat(String(price));
    return Number.isFinite(value) && value > 0;
}

export function formatPrice(price: unknown): string {
    const value = typeof price === 'number' ? price : parseFloat(String(price));
    if (!Number.isFinite(value) || value <= 0) return 'Price unavailable';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

export function discountPercent(mrp: number, selling: number): number {
    if (!hasValidPrice(mrp) || !hasValidPrice(selling) || mrp <= selling) return 0;
    return Math.round(((mrp - selling) / mrp) * 100);
}

export function resolveImageUrl(url?: string | null): string {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    const base = API_BASE_URL.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
    return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
}
