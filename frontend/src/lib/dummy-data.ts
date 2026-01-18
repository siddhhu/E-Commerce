// Dummy products data for Pranjay cosmetics store

export interface Product {
    id: string;
    name: string;
    slug: string;
    sku: string;
    description: string;
    short_description: string;
    mrp: number;
    selling_price: number;
    b2b_price: number;
    stock_quantity: number;
    min_order_quantity: number;
    category_id: string;
    category_name: string;
    brand_id: string;
    brand_name: string;
    unit: string;
    is_active: boolean;
    is_featured: boolean;
    images: { id: string; image_url: string; alt_text: string; is_primary: boolean }[];
}

export const dummyProducts: Product[] = [
    {
        id: '1',
        name: 'Matte Velvet Lipstick - Ruby Red',
        slug: 'matte-velvet-lipstick-ruby-red',
        sku: 'LIP-001',
        description: 'A stunning matte lipstick that delivers intense color payoff with a velvet-soft finish. Long-lasting formula that stays put for up to 8 hours without drying your lips.',
        short_description: 'Long-lasting matte finish, 8-hour wear',
        mrp: 599,
        selling_price: 449,
        b2b_price: 320,
        stock_quantity: 150,
        min_order_quantity: 5,
        category_id: 'cat-1',
        category_name: 'Lipsticks',
        brand_id: 'brand-1',
        brand_name: 'Pranjay Beauty',
        unit: 'pcs',
        is_active: true,
        is_featured: true,
        images: [
            { id: 'img-1', image_url: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=500', alt_text: 'Ruby Red Lipstick', is_primary: true }
        ]
    },
    {
        id: '2',
        name: 'HD Foundation - Natural Beige',
        slug: 'hd-foundation-natural-beige',
        sku: 'FND-001',
        description: 'Achieve flawless, camera-ready skin with our HD Foundation. Lightweight, buildable coverage that lasts all day. Enriched with vitamin E for skin nourishment.',
        short_description: 'Buildable coverage, vitamin E enriched',
        mrp: 899,
        selling_price: 699,
        b2b_price: 480,
        stock_quantity: 200,
        min_order_quantity: 3,
        category_id: 'cat-2',
        category_name: 'Foundations',
        brand_id: 'brand-1',
        brand_name: 'Pranjay Beauty',
        unit: 'pcs',
        is_active: true,
        is_featured: true,
        images: [
            { id: 'img-2', image_url: 'https://images.unsplash.com/photo-1631214540553-ff044a3ff1d4?w=500', alt_text: 'HD Foundation', is_primary: true }
        ]
    },
    {
        id: '3',
        name: 'Smokey Eye Palette - Midnight',
        slug: 'smokey-eye-palette-midnight',
        sku: 'EYE-001',
        description: '12 stunning shades perfect for creating dramatic smokey eyes or subtle everyday looks. Highly pigmented, blendable formula with both matte and shimmer finishes.',
        short_description: '12 shades, matte & shimmer',
        mrp: 1299,
        selling_price: 999,
        b2b_price: 650,
        stock_quantity: 80,
        min_order_quantity: 2,
        category_id: 'cat-3',
        category_name: 'Eye Makeup',
        brand_id: 'brand-2',
        brand_name: 'Glow Studio',
        unit: 'pcs',
        is_active: true,
        is_featured: true,
        images: [
            { id: 'img-3', image_url: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=500', alt_text: 'Smokey Eye Palette', is_primary: true }
        ]
    },
    {
        id: '4',
        name: 'Hydrating Face Serum',
        slug: 'hydrating-face-serum',
        sku: 'SKN-001',
        description: 'Intense hydration serum with hyaluronic acid and vitamin C. Plumps and brightens skin while providing 72-hour moisture retention.',
        short_description: 'Hyaluronic acid + Vitamin C',
        mrp: 799,
        selling_price: 599,
        b2b_price: 420,
        stock_quantity: 120,
        min_order_quantity: 5,
        category_id: 'cat-4',
        category_name: 'Skincare',
        brand_id: 'brand-3',
        brand_name: 'Pure Glow',
        unit: 'pcs',
        is_active: true,
        is_featured: false,
        images: [
            { id: 'img-4', image_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500', alt_text: 'Face Serum', is_primary: true }
        ]
    },
    {
        id: '5',
        name: 'Volumizing Mascara - Jet Black',
        slug: 'volumizing-mascara-jet-black',
        sku: 'EYE-002',
        description: 'Get dramatic lashes with our volumizing mascara. Clump-free formula that adds volume and length. Water-resistant and smudge-proof.',
        short_description: 'Clump-free, water-resistant',
        mrp: 499,
        selling_price: 399,
        b2b_price: 280,
        stock_quantity: 250,
        min_order_quantity: 10,
        category_id: 'cat-3',
        category_name: 'Eye Makeup',
        brand_id: 'brand-1',
        brand_name: 'Pranjay Beauty',
        unit: 'pcs',
        is_active: true,
        is_featured: false,
        images: [
            { id: 'img-5', image_url: 'https://images.unsplash.com/photo-1631214500115-598fc2cb8c8f?w=500', alt_text: 'Mascara', is_primary: true }
        ]
    },
    {
        id: '6',
        name: 'Nude Lip Gloss - Honey',
        slug: 'nude-lip-gloss-honey',
        sku: 'LIP-002',
        description: 'Sheer, glossy finish with a hint of color. Non-sticky formula that keeps lips hydrated and plump all day long.',
        short_description: 'Non-sticky, hydrating formula',
        mrp: 399,
        selling_price: 299,
        b2b_price: 210,
        stock_quantity: 180,
        min_order_quantity: 10,
        category_id: 'cat-1',
        category_name: 'Lipsticks',
        brand_id: 'brand-2',
        brand_name: 'Glow Studio',
        unit: 'pcs',
        is_active: true,
        is_featured: false,
        images: [
            { id: 'img-6', image_url: 'https://images.unsplash.com/photo-1619451334792-150fd785ee74?w=500', alt_text: 'Lip Gloss', is_primary: true }
        ]
    },
    {
        id: '7',
        name: 'Setting Powder - Translucent',
        slug: 'setting-powder-translucent',
        sku: 'FND-002',
        description: 'Finely milled translucent powder that sets makeup and controls shine. Blurs imperfections for a flawless, airbrushed finish.',
        short_description: 'Oil control, blurs imperfections',
        mrp: 649,
        selling_price: 499,
        b2b_price: 350,
        stock_quantity: 90,
        min_order_quantity: 5,
        category_id: 'cat-2',
        category_name: 'Foundations',
        brand_id: 'brand-1',
        brand_name: 'Pranjay Beauty',
        unit: 'pcs',
        is_active: true,
        is_featured: false,
        images: [
            { id: 'img-7', image_url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500', alt_text: 'Setting Powder', is_primary: true }
        ]
    },
    {
        id: '8',
        name: 'Rose Face Mist',
        slug: 'rose-face-mist',
        sku: 'SKN-002',
        description: 'Refreshing rose water mist that hydrates, tones, and sets makeup. Perfect for a quick pick-me-up anytime during the day.',
        short_description: 'Hydrating rose water formula',
        mrp: 349,
        selling_price: 249,
        b2b_price: 180,
        stock_quantity: 300,
        min_order_quantity: 12,
        category_id: 'cat-4',
        category_name: 'Skincare',
        brand_id: 'brand-3',
        brand_name: 'Pure Glow',
        unit: 'pcs',
        is_active: true,
        is_featured: true,
        images: [
            { id: 'img-8', image_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500', alt_text: 'Face Mist', is_primary: true }
        ]
    }
];

export const categories = [
    { id: 'cat-1', name: 'Lipsticks', slug: 'lipsticks', count: 2 },
    { id: 'cat-2', name: 'Foundations', slug: 'foundations', count: 2 },
    { id: 'cat-3', name: 'Eye Makeup', slug: 'eye-makeup', count: 2 },
    { id: 'cat-4', name: 'Skincare', slug: 'skincare', count: 2 },
];

export const brands = [
    { id: 'brand-1', name: 'Pranjay Beauty', slug: 'pranjay-beauty' },
    { id: 'brand-2', name: 'Glow Studio', slug: 'glow-studio' },
    { id: 'brand-3', name: 'Pure Glow', slug: 'pure-glow' },
];

export function getProductBySlug(slug: string): Product | undefined {
    return dummyProducts.find(p => p.slug === slug);
}

export function getProductById(id: string): Product | undefined {
    return dummyProducts.find(p => p.id === id);
}

export function getFeaturedProducts(): Product[] {
    return dummyProducts.filter(p => p.is_featured);
}

export function getProductsByCategory(categorySlug: string): Product[] {
    const category = categories.find(c => c.slug === categorySlug);
    if (!category) return [];
    return dummyProducts.filter(p => p.category_id === category.id);
}
