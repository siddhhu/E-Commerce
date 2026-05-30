const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_VERSION = 'v1';

interface ApiError {
    detail: string;
}

export interface PromoCode {
    id: string;
    code: string;
    discount_type: 'flat' | 'percent';
    discount_value: number;
    max_discount_amount: number;
    is_active: boolean;
    max_uses?: number | null;
    used_count: number;
    expires_at?: string | null;
    created_at: string;
    updated_at: string;
}

class ApiClient {
    private baseUrl: string;

    constructor() {
        const cleanlyStrippedBase = API_BASE_URL.replace(/\/+$/, '');
        this.baseUrl = `${cleanlyStrippedBase}/api/${API_VERSION}`;
    }

    private getHeaders(): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };
        // Add auth token if available
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('access_token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        return headers;
    }

    private async handleResponse<T>(response: Response): Promise<T> {
        if (!response.ok) {
            let errorMessage = 'An error occurred';
            try {
                const errorData = await response.json();
                if (errorData.detail) {
                    if (typeof errorData.detail === 'string') {
                        errorMessage = errorData.detail;
                    } else if (Array.isArray(errorData.detail)) {
                        // FastAPI validation errors are an array of objects
                        errorMessage = errorData.detail
                            .map((err: any) => `${err.loc?.join('.') || 'error'}: ${err.msg}`)
                            .join(', ');
                    }
                }
            } catch (e) {
                // If not JSON, use status text
                errorMessage = response.statusText || errorMessage;
            }

            if (response.status === 401) {
                if (typeof window !== 'undefined') {
                    if (!window.location.pathname.includes('/login')) {
                        localStorage.removeItem('access_token');
                        localStorage.removeItem('refresh_token');
                        localStorage.removeItem('pranjay-auth');
                        const isAdmin = window.location.pathname.startsWith('/admin');
                        const loginUrl = isAdmin ? '/admin/login' : '/login';
                        window.location.href = `${loginUrl}?expired=true`;
                    }
                }
                throw new Error('Session expired. Please login again.');
            }

            throw new Error(errorMessage);
        }

        // Handle 204 No Content
        if (response.status === 204) {
            return {} as T;
        }

        return response.json();
    }

    async get<T>(endpoint: string): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'GET',
            headers: this.getHeaders(),
        });
        return this.handleResponse<T>(response);
    }

    async post<T>(endpoint: string, data?: unknown): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: data ? JSON.stringify(data) : undefined,
        });
        return this.handleResponse<T>(response);
    }

    async patch<T>(endpoint: string, data: unknown): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'PATCH',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        return this.handleResponse<T>(response);
    }

    async delete<T>(endpoint: string): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
        return this.handleResponse<T>(response);
    }

    async uploadFile<T>(endpoint: string, file: File, additionalData?: Record<string, string>): Promise<T> {
        const formData = new FormData();
        formData.append('file', file);

        if (additionalData) {
            Object.entries(additionalData).forEach(([key, value]) => {
                formData.append(key, value);
            });
        }

        const headers: HeadersInit = {};
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('access_token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers,
            body: formData,
        });
        return this.handleResponse<T>(response);
    }
}

export const api = new ApiClient();

// Small helper for multipart uploads
function getApiBaseUrl(): string {
    const cleanlyStrippedBase = API_BASE_URL.replace(/\/+$/, '');
    return `${cleanlyStrippedBase}/api/${API_VERSION}`;
}

async function postMultipart<T>(endpoint: string, formData: FormData): Promise<T> {
    const headers: HeadersInit = {};
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('access_token');
        if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
    });
    // Reuse handleResponse (private) is not possible, so mirror behavior
    if (!response.ok) {
        let errorMessage = 'An error occurred';
        try {
            const errorData = await response.json();
            if (errorData.detail) errorMessage = errorData.detail;
        } catch {
            errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
    }
    if (response.status === 204) return {} as T;
    return response.json();
}

// Promo Codes API
export const promoCodesApi = {
    validate: (code: string, subtotal: number) =>
        api.post<{ code: string; discount_amount: number }>(`/promo-codes/validate`, { code, subtotal }),
};

// Invoices API
export const invoicesApi = {
    upload: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return postMultipart<{ invoice_url: string }>(`/invoices/upload`, formData);
    },
};

// Auth API
export const authApi = {
    requestOtp: (email: string) =>
        api.post<{ message: string }>('/auth/request-otp', { email }),

    verifyOtp: (email: string, otp: string) =>
        api.post<{
            access_token: string;
            refresh_token: string;
            token_type: string;
            user: User;
        }>('/auth/verify-otp', { email, otp }),

    adminLogin: (email: string, password: string) =>
        api.post<{
            access_token: string;
            refresh_token: string;
            token_type: string;
            user: User;
        }>('/auth/admin/login', { email, password }),

    verifyFirebaseToken: (idToken: string) =>
        api.post<{
            access_token: string;
            refresh_token: string;
            token_type: string;
            user: User;
        }>('/auth/verify-firebase', { id_token: idToken }),

    refreshToken: (refreshToken: string) =>
        api.post<{
            access_token: string;
            refresh_token: string;
            token_type: string;
            user: User;
        }>('/auth/refresh', { refresh_token: refreshToken }),

    sellerLogin: (username: string, password: string) =>
        api.post<{
            access_token: string;
            refresh_token: string;
            token_type: string;
            user: User;
        }>('/auth/seller/login', { username, password }),

    updateProfile: (data: { 
        full_name?: string; 
        business_name?: string; 
        contact_email?: string;
        gst_number?: string; 
        pan?: string;
        aadhaar?: string;
        shop_license?: string;
        user_type?: 'seller' | 'customer' 
    }) =>
        api.patch<User>('/users/me', data),

    /** Change password — requires current password for verification. */
    changePassword: (data: { current_password: string; new_password: string }) =>
        api.post<{ message: string }>('/users/me/change-password', data),
};

// Users API
export const usersApi = {
    getAddresses: () => api.get<Address[]>('/users/me/addresses'),
    createAddress: (data: Omit<Address, 'id' | 'user_id' | 'created_at' | 'updated_at'>) =>
        api.post<Address>('/users/me/addresses', data),
    /** Single round-trip: returns addresses + cart together for the checkout page. */
    getCheckoutPrep: () => api.get<{ addresses: Address[]; cart: any }>('/checkout-prep'),
    submitSellerApplication: async (file: File) => {
        // 1. Upload the document file
        const formData = new FormData();
        formData.append('file', file);
        const { invoice_url } = await postMultipart<{ invoice_url: string }>('/invoices/upload', formData);
        // 2. Submit the application with the uploaded URL
        return api.post<User>('/users/me/seller-application', { invoice_url });
    },
};

// Products API
export const productsApi = {
    list: (params?: {
        page?: number;
        page_size?: number;
        category_id?: string;
        brand_id?: string;
        search?: string;
    }) => {
        const searchParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value) searchParams.append(key, String(value));
            });
        }
        return api.get<PaginatedProducts>(`/products?${searchParams}`);
    },

    getFeatured: (limit = 10) =>
        api.get<Product[]>(`/products/featured?limit=${limit}`),

    getFeaturedBrands: () =>
        api.get<any[]>('/products/brands/featured'),

    getBySlug: (slug: string) =>
        api.get<Product>(`/products/${slug}`),

    getVariants: (slug: string) =>
        api.get<ProductSummary[]>(`/products/${slug}/variants`),

    getSearchIndex: () =>
        api.get<SearchIndexItem[]>('/products/search-index'),
};

// Categories API
export const categoriesApi = {
    list: () => api.get<CategoryRead[]>('/categories'),
    getTree: () => api.get<CategoryWithChildren[]>('/categories/tree'),
    getBySlug: (slug: string) => api.get<CategoryWithChildren>(`/categories/${slug}`),
};

// Cart API
export const cartApi = {
    get: () => api.get<Cart>('/cart'),

    addItem: (productId: string, quantity = 1) =>
        api.post<CartItem>('/cart/items', { product_id: productId, quantity }),

    updateItem: (itemId: string, quantity: number) =>
        api.patch<CartItem>(`/cart/items/${itemId}`, { quantity }),

    removeItem: (itemId: string) =>
        api.delete(`/cart/items/${itemId}`),

    clear: () => api.delete('/cart'),

    syncAll: async (items: { product_id: string; quantity: number }[]) => {
        // Clear backend cart first, then add all current frontend items IN PARALLEL
        await api.delete('/cart');
        if (items.length === 0) return 0;

        const results = await Promise.allSettled(
            items.map(item => api.post('/cart/items', item))
        );

        const synced = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected');

        failed.forEach((f, i) => {
            if (f.status === 'rejected') {
                console.warn('Skipping cart item that failed to sync:', items[i]?.product_id, f.reason);
            }
        });

        if (synced === 0 && items.length > 0) {
            throw new Error('None of the cart items could be added. Please remove old items and try again.');
        }
        return synced;
    }
};

// Orders API
export const ordersApi = {
    list: (params?: { page?: number; page_size?: number; status?: string }) => {
        const searchParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value) searchParams.append(key, String(value));
            });
        }
        return api.get<PaginatedOrders>(`/orders?${searchParams}`);
    },

    get: (orderId: string) =>
        api.get<Order>(`/orders/${orderId}`),

    /**
     * ONLINE PHASE 1: Validate cart + create Razorpay order.
     * Does NOT create a DB order. Returns razorpay_order_id to pass to Razorpay SDK.
     * Call this BEFORE opening the Razorpay popup.
     */
    prepareCheckout: (data: {
        cart_items: { product_id: string; quantity: number }[];
        promo_code?: string;
    }) => api.post<{ razorpay_order_id: string; amount_paise: number; amount_display: number }>(
        '/checkout/prepare', data
    ),

    /**
     * CHECKOUT COMPLETE: address save + cart sync + DB order creation.
     * - COD:    call directly, no Razorpay fields needed.
     * - ONLINE: call ONLY after Razorpay confirms payment. Pass Razorpay details
     *           so the backend verifies signature BEFORE creating the DB order.
     *           This means: if payment is cancelled, this is never called → no DB order created.
     */
    completeCheckout: (data: {
        // Address
        full_name: string;
        phone: string;
        address_line1: string;
        address_line2?: string;
        city: string;
        state: string;
        postal_code: string;
        country?: string;
        // Cart
        cart_items: { product_id: string; quantity: number }[];
        // Order
        payment_method: string;
        notes?: string;
        promo_code?: string;
        // Razorpay — required for payment_method="online"
        razorpay_payment_id?: string;
        razorpay_order_id?: string;
        razorpay_signature?: string;
    }) => api.post<Order>('/checkout/complete', data),

    /** Legacy: only used if shipping_address_id is already known. */
    checkout: (data: { shipping_address_id: string; payment_method: string; notes?: string; promo_code?: string }) =>
        api.post<Order>('/checkout', data),

    cancel: (orderId: string) =>
        api.post<Order>(`/orders/${orderId}/cancel`),

    /**
     * @deprecated Use the two-phase flow (prepareCheckout → Razorpay → completeCheckout).
     * Kept for legacy compatibility only.
     */
    verifyPayment: (orderId: string, data: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
    }) => api.post<Order>(`/orders/${orderId}/verify-payment`, data),
};

// Admin API
export const adminApi = {
    // Categories
    listCategories: () => api.get<CategoryRead[]>('/admin/categories'),
    createCategory: (data: Partial<CategoryRead>) => api.post<CategoryRead>('/admin/categories', data),
    updateCategory: (id: string, data: Partial<CategoryRead>) => api.patch<CategoryRead>(`/admin/categories/${id}`, data),
    deleteCategory: (id: string) => api.delete(`/admin/categories/${id}`),

    // Dashboard
    getDashboardStats: (date?: string) => 
        api.get<DashboardStats>(date ? `/admin/dashboard?date=${date}` : '/admin/dashboard'),
    getRecentOrders: (limit: number = 10, date?: string) => {
        const url = `/admin/dashboard/recent-orders?limit=${limit}${date ? `&date=${date}` : ''}`;
        return api.get<RecentOrder[]>(url);
    },
    
    // Orders
    listOrders: (params?: { page?: number; page_size?: number; status?: string; search?: string }) => {
        const searchParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value) searchParams.append(key, String(value));
            });
        }
        return api.get<PaginatedOrders>(`/admin/orders?${searchParams}`);
    },
    getOrder: (id: string) => api.get<Order>(`/admin/orders/${id}`),
    updateOrderStatus: (id: string, status: string) => 
        api.patch(`/admin/orders/${id}/status`, { status }),
    cancelOrder: (id: string) =>
        api.post<Order>(`/admin/orders/${id}/cancel`),
        
    // Products
    listProducts: (params?: { page?: number; page_size?: number; category_id?: string; brand_id?: string; is_active?: boolean; search?: string }) => {
        const searchParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value) searchParams.append(key, String(value));
            });
        }
        return api.get<PaginatedProducts>(`/admin/products?${searchParams}`);
    },
    getProduct: (id: string) => api.get<Product>(`/admin/products/${id}`),
    createProduct: (data: Partial<Product>) => api.post<Product>('/admin/products', data),
    updateProduct: (id: string, data: Partial<Product>) => api.patch<Product>(`/admin/products/${id}`, data),
    deleteProduct: (id: string) => api.delete(`/admin/products/${id}`),
    
    // Banners
    listBanners: (params?: { page?: number; page_size?: number; is_active?: boolean }) => {
        const searchParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) searchParams.append(key, String(value));
            });
        }
        return api.get<PaginatedBanners>(`/admin/banners?${searchParams}`);
    },
    getBanner: (id: string) => api.get<Banner>(`/admin/banners/${id}`),
    createBanner: (data: Partial<Banner>) => api.post<Banner>('/admin/banners', data),
    updateBanner: (id: string, data: Partial<Banner>) => api.patch<Banner>(`/admin/banners/${id}`, data),
    deleteBanner: (id: string) => api.delete(`/admin/banners/${id}`),
    
    // Users
    listUsers: (params?: { page?: number; page_size?: number; role?: string; is_active?: boolean }) => {
        const searchParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) searchParams.append(key, String(value));
            });
        }
        return api.get<PaginatedUsersAdmin>(`/admin/users?${searchParams}`);
    },
    getUser: (id: string) => api.get<User>(`/admin/users/${id}`),
    verifyUser: (id: string, isVerified: boolean = true) => 
        api.post<User>(`/admin/users/${id}/verify?is_verified=${isVerified}`),

    // Seller Applications (super admin only)
    listPendingSellers: () => api.get<User[]>('/admin/users/sellers/pending'),
    approveSeller: (id: string) => api.post<SellerCredentials>(`/admin/users/${id}/approve-seller`),
    rejectSeller: (id: string) => api.post<User>(`/admin/users/${id}/reject-seller`),

    // Promo Codes
    listPromoCodes: (params?: { page?: number; page_size?: number }) => {
        const searchParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) searchParams.append(key, String(value));
            });
        }
        return api.get<{ items: PromoCode[]; total: number; page: number; page_size: number }>(
            `/admin/promo-codes?${searchParams}`
        );
    },
    createPromoCode: (data: Partial<PromoCode>) => api.post<PromoCode>('/admin/promo-codes', data),
    updatePromoCode: (id: string, data: Partial<PromoCode>) => api.patch<PromoCode>(`/admin/promo-codes/${id}`, data),
    deletePromoCode: (id: string) => api.delete(`/admin/promo-codes/${id}`),
    uploadBannerImage: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return postMultipart<{ image_url: string }>(`/admin/banners/upload-image`, formData);
    },
    uploadProductImage: async (productId: string, file: File, isPrimary: boolean = true) => {
        const formData = new FormData();
        formData.append('file', file);
        return postMultipart<{ id: string; image_url: string }>(
            `/admin/products/${productId}/images?is_primary=${isPrimary ? 'true' : 'false'}`,
            formData
        );
    },
};

export interface PaginatedUsersAdmin {
    items: User[];
    total: number;
    page: number;
    page_size: number;
}

export const bannerApi = {
    list: () => api.get<Banner[]>('/banners'),
};

// Types
export interface Address {
    id: string;
    user_id: string;
    full_name: string;
    phone: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

export interface User {
    id: string;
    email: string;
    phone?: string;
    full_name?: string;
    business_name?: string;
    contact_email?: string | null;
    gst_number?: string;
    pan?: string;
    aadhaar?: string;
    shop_license?: string;
    user_type: 'seller' | 'customer';
    role: 'customer' | 'admin' | 'super_admin' | 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN';
    is_active: boolean;
    is_verified: boolean;
    // Seller onboarding fields
    seller_status?: 'none' | 'pending' | 'approved' | 'rejected';
    seller_invoice_url?: string | null;
    seller_username?: string | null;
    seller_plain_password?: string | null;
    created_at: string;
    updated_at: string;
}

export interface SellerCredentials {
    id: string;
    seller_username: string;
    seller_plain_password: string;
    seller_status: string;
    business_name?: string;
    full_name?: string;
}

export interface Product {
    id: string;
    name: string;
    slug: string;
    sku: string;
    description?: string;
    short_description?: string;
    mrp: number;
    selling_price: number;
    b2b_price?: number;
    stock_quantity: number;
    gst_percentage?: number;
    min_order_quantity: number;
    category_id?: string;
    category_ids?: string[];
    brand_id?: string;
    unit: string;
    parent_id?: string;
    attributes: Record<string, unknown>;
    is_active: boolean;
    is_featured: boolean;
    image_url?: string;
    images: ProductImage[];
    seller_id?: string;
    seller_name?: string;
    seller_gst_number?: string;
    created_at: string;
    updated_at: string;
}

export interface ProductImage {
    id: string;
    product_id: string;
    image_url: string;
    alt_text?: string;
    sort_order: number;
    is_primary: boolean;
}

export interface ProductSummary {
    id: string;
    name: string;
    slug: string;
    sku: string;
    short_description?: string;
    mrp: number;
    selling_price: number;
    b2b_price?: number;
    stock_quantity: number;
    gst_percentage?: number;
    is_featured: boolean;
    category_id?: string;
    category_ids?: string[];
    parent_id?: string;
    primary_image?: string;
    seller_id?: string;
    seller_name?: string;
}

export interface SearchIndexItem {
    id: string;
    name: string;
    slug: string;
    sku: string;
    selling_price: number;
    mrp: number;
    image: string | null;
    short_description: string;
    seller_name: string;
}

export interface PaginatedProducts {
    items: ProductSummary[];
    total: number;
    page: number;
    page_size: number;
    pages: number;
}

export interface CategoryRead {
    id: string;
    name: string;
    slug: string;
    description?: string;
    image_url?: string;
    parent_id?: string;
    sort_order: number;
    is_active: boolean;
    seller_id?: string;
    seller_name?: string;
    created_at: string;
}

export interface CategoryWithChildren extends CategoryRead {
    children: CategoryRead[];
}

export interface CartItem {
    id: string;
    user_id: string;
    product_id: string;
    quantity: number;
    product_name: string;
    product_slug: string;
    product_sku: string;
    unit_price: number;
    primary_image?: string;
    total_price: number;
}

export interface Cart {
    items: CartItem[];
    items_count: number;
    subtotal: number;
    currency: string;
}

export interface Order {
    id: string;
    order_number: string;
    status: string;
    payment_status: string;
    payment_method?: string;
    subtotal: number;
    promo_code?: string | null;
    discount_amount: number;
    shipping_amount: number;
    tax_amount: number;
    total_amount: number;
    invoice_url?: string | null;
    product_summary?: string;
    items_count?: number;
    
    // Admin customer fields
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    shipping_address_data?: {
        full_name: string;
        phone: string;
        address_line1: string;
        address_line2?: string;
        city: string;
        state: string;
        postal_code: string;
        country: string;
    };
    
    items: OrderItem[];
    placed_at?: string;
    shipped_at?: string;
    delivered_at?: string;
    created_at: string;
    updated_at: string;
}

export interface OrderItem {
    id: string;
    order_id: string;
    product_id?: string;
    product_name: string;
    product_sku: string;
    unit_price: number;
    quantity: number;
    total_price: number;
}

export interface PaginatedOrders {
    items: Order[];
    total: number;
    page: number;
    page_size: number;
}

export interface DashboardStats {
    total_users: number;
    total_products: number;
    total_orders: number;
    pending_orders: number;
    total_revenue: number;
    orders_today: number;
    cod_orders: number;
    online_orders: number;
    low_stock_products: number;
}

export interface RecentOrder {
    order_number: string;
    customer_email: string;
    customer_name?: string;
    total_amount: number;
    status: string;
    created_at: string;
}

export interface Banner {
    id: string;
    title: string;
    image_url: string;
    link_url?: string;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface PaginatedBanners {
    items: Banner[];
    total: number;
    page: number;
    page_size: number;
}
