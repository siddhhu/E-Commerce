const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_VERSION = 'v1';

interface ApiError {
    detail: string;
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

    updateProfile: (data: { 
        full_name?: string; 
        business_name?: string; 
        gst_number?: string; 
        pan?: string;
        aadhaar?: string;
        shop_license?: string;
        user_type?: 'seller' | 'customer' 
    }) =>
        api.patch<User>('/users/me', data),
};

// Users API
export const usersApi = {
    getAddresses: () => api.get<Address[]>('/users/me/addresses'),
    createAddress: (data: Omit<Address, 'id' | 'user_id' | 'created_at' | 'updated_at'>) =>
        api.post<Address>('/users/me/addresses', data),
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

    getBySlug: (slug: string) =>
        api.get<Product>(`/products/${slug}`),
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
        // Clear backend cart first, then add all current frontend items
        await api.delete('/cart');
        let synced = 0;
        for (const item of items) {
            try {
                await api.post('/cart/items', item);
                synced++;
            } catch (err) {
                // Skip items with invalid/non-existent product IDs (e.g. stale dummy data)
                console.warn('Skipping cart item that failed to sync:', item.product_id, err);
            }
        }
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

    checkout: (data: { shipping_address_id: string; payment_method: string; notes?: string }) =>
        api.post<Order>('/checkout', data),

    cancel: (orderId: string) =>
        api.post<Order>(`/orders/${orderId}/cancel`),
};

// Admin API
export const adminApi = {
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
    gst_number?: string;
    pan?: string;
    aadhaar?: string;
    shop_license?: string;
    user_type: 'seller' | 'customer';
    role: 'customer' | 'admin' | 'super_admin';
    is_active: boolean;
    is_verified: boolean;
    created_at: string;
    updated_at: string;
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
    min_order_quantity: number;
    category_id?: string;
    brand_id?: string;
    unit: string;
    attributes: Record<string, unknown>;
    is_active: boolean;
    is_featured: boolean;
    image_url?: string;
    images: ProductImage[];
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
    is_featured: boolean;
    primary_image?: string;
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
    discount_amount: number;
    shipping_amount: number;
    tax_amount: number;
    total_amount: number;
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
