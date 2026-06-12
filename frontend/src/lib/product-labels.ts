type ProductLike = {
    mrp: number;
    selling_price: number;
    b2b_price?: number;
    stock_quantity: number;
    is_featured: boolean;
    created_at?: string;
};

export function getProductLabels(product: ProductLike) {
    const mrp = Number(product.mrp) || 0;
    const selling = Number(product.selling_price) || 0;
    const discount = mrp > selling && mrp > 0 ? Math.round(((mrp - selling) / mrp) * 100) : 0;
    const createdAt = 'created_at' in product && product.created_at ? new Date(product.created_at).getTime() : 0;
    const daysOld = createdAt ? (Date.now() - createdAt) / (1000 * 60 * 60 * 24) : null;

    const labels: { text: string; className: string }[] = [];

    if (product.is_featured) {
        labels.push({ text: 'Bestseller', className: 'bg-[#e91e63] text-white' });
    }
    if (daysOld !== null && daysOld <= 30) {
        labels.push({ text: 'New', className: 'bg-emerald-600 text-white' });
    }
    if (discount >= 35) {
        labels.push({ text: 'Salon Pick', className: 'bg-violet-600 text-white' });
    }
    if (product.b2b_price && Number(product.b2b_price) < selling) {
        labels.push({ text: 'Wholesale Deal', className: 'bg-amber-500 text-white' });
    }
    if (product.stock_quantity <= 0) {
        labels.push({ text: 'Out of Stock', className: 'bg-slate-600 text-white' });
    }

    return labels;
}
