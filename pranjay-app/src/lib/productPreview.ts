import type { Product, ProductSummary } from '@/src/lib/types';

/**
 * A product card already holds everything needed to draw the top of the detail
 * screen (image, name, price, stock).  Keeping the last tapped summary lets the
 * detail screen paint that instantly instead of showing a spinner for the
 * ~2–3s the detail request takes.
 */
const MAX_ENTRIES = 40;
const previews = new Map<string, ProductSummary>();

export function primeProductPreview(product: ProductSummary): void {
    previews.set(product.slug, product);
    if (previews.size > MAX_ENTRIES) {
        const oldest = previews.keys().next().value;
        if (oldest !== undefined) previews.delete(oldest);
    }
}

export function peekProductPreview(slug: string | undefined): ProductSummary | null {
    if (!slug) return null;
    return previews.get(slug) ?? null;
}

/** Shape a summary like a detail payload so shared render paths keep working. */
export function productFromSummary(summary: ProductSummary): Product {
    return {
        ...summary,
        image_url: summary.primary_image ?? summary.image_url ?? null,
        images: [],
        min_order_quantity: 1,
        unit: 'pcs',
        attributes: {},
    };
}
