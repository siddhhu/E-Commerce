/** API types — kept in sync with backend/app/models/*.py */

export interface User {
    id: string;
    email: string;
    phone?: string | null;
    full_name?: string | null;
    business_name?: string | null;
    contact_email?: string | null;
    gst_number?: string | null;
    pan?: string | null;
    aadhaar?: string | null;
    voter_id?: string | null;
    shop_license?: string | null;
    msme_number?: string | null;
    udyog_aadhar?: string | null;
    shop_establishment_license?: string | null;
    kyc_document_type?: string | null;
    kyc_document_url?: string | null;
    kyc_verified_at?: string | null;
    user_type?: 'seller' | 'customer';
    role?: 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN';
    is_active?: boolean;
    is_verified?: boolean;
    seller_status?: 'none' | 'pending' | 'approved' | 'rejected';
    seller_username?: string | null;
    bank_account_holder_name?: string | null;
    bank_account_number?: string | null;
    bank_ifsc?: string | null;
    bank_name?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface ProductSummary {
    id: string;
    name: string;
    slug: string;
    sku: string;
    short_description?: string | null;
    mrp: number;
    selling_price: number;
    b2b_price?: number | null;
    stock_quantity: number;
    gst_percentage?: number;
    is_featured: boolean;
    is_discounted_featured: boolean;
    category_id?: string | null;
    category_ids?: string[];
    image_url?: string | null;
    primary_image?: string | null;
    seller_id?: string | null;
    seller_name?: string | null;
    parent_id?: string | null;
}

export interface ProductImage {
    id: string;
    product_id?: string;
    image_url: string;
    alt_text?: string | null;
    sort_order?: number;
    is_primary?: boolean;
}

export interface Product extends ProductSummary {
    description?: string | null;
    images: ProductImage[];
    min_order_quantity: number;
    unit?: string;
    attributes: Record<string, unknown>;
    is_active?: boolean;
    seller_gst_number?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface Category {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    image_url?: string | null;
    parent_id?: string | null;
    sort_order?: number;
    is_active: boolean;
}

export interface Brand {
    id: string;
    name: string;
    slug?: string;
    logo_url?: string | null;
    max_discount?: number;
    product_count?: number;
}

export interface CartItem {
    id: string;
    user_id?: string;
    product_id: string;
    quantity: number;
    product_name: string;
    product_slug: string;
    product_sku: string;
    unit_price: number;
    primary_image?: string | null;
    total_price: number;
    created_at?: string;
    updated_at?: string;
}

export interface Cart {
    items: CartItem[];
    items_count: number;
    subtotal: number;
    currency: string;
}

export type OrderStatus =
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled';

export interface OrderSummary {
    id: string;
    order_number: string;
    status: OrderStatus | string;
    payment_status: string;
    payment_method?: string | null;
    total_amount: number;
    items_count?: number;
    product_summary?: string | null;
    placed_at?: string | null;
    created_at: string;
}

export interface OrderItem {
    id: string;
    order_id?: string;
    product_id?: string | null;
    product_name: string;
    product_sku?: string;
    unit_price: number;
    quantity: number;
    total_price: number;
    is_cancelled?: boolean;
    cancellation_reason?: string | null;
}

export interface ShippingAddress {
    full_name: string;
    phone: string;
    address_line1: string;
    address_line2?: string | null;
    city: string;
    state: string;
    postal_code: string;
    country?: string;
}

export interface Order extends OrderSummary {
    subtotal: number;
    promo_code?: string | null;
    discount_amount: number;
    shipping_amount: number;
    tax_amount: number;
    invoice_url?: string | null;
    order_metadata?: Record<string, unknown>;
    shipping_address_data?: ShippingAddress | null;
    items: OrderItem[];
    shipped_at?: string | null;
    delivered_at?: string | null;
}

export interface Address {
    id: string;
    user_id?: string;
    label?: string;
    full_name: string;
    phone: string;
    address_line1: string;
    address_line2?: string | null;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    is_default: boolean;
    created_at?: string;
}

export interface WishlistItem {
    id: string;
    user_id?: string;
    product_id: string;
    product_name: string;
    product_slug: string;
    product_sku: string;
    selling_price: number;
    mrp: number;
    primary_image?: string | null;
    is_in_stock: boolean;
    created_at?: string;
}

export interface PaginatedOrders {
    items: OrderSummary[];
    total: number;
    page: number;
    page_size: number;
}

export interface PaginatedProducts {
    items: ProductSummary[];
    total: number;
    page: number;
    page_size: number;
    pages?: number;
}

export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    user: User;
}

export interface HomeBootstrap {
    featured: ProductSummary[];
    discounted: ProductSummary[];
    categories: Category[];
    promos: PromoCode[];
    banners: AppBanner[];
}

export interface PromoCode {
    id: string;
    code: string;
    discount_type: 'flat' | 'percent';
    discount_value: number;
    max_discount_amount?: number;
    is_active: boolean;
    expires_at?: string | null;
}

export interface AppBanner {
    id: string;
    title: string;
    image_url: string;
    link_url?: string | null;
    is_active?: boolean;
    sort_order?: number;
}

export interface ProductDetailBundle {
    product: Product;
    variants: ProductSummary[];
    related: ProductSummary[];
}
