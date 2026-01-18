const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_VERSION = 'v1';

interface ApiError {
    detail: string;
}

class ApiClient {
    private baseUrl: string;

    constructor() {
        this.baseUrl = `${API_BASE_URL}/api/${API_VERSION}`;
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
            const error: ApiError = await response.json();
            throw new Error(error.detail || 'An error occurred');
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

    refreshToken: (refreshToken: string) =>
        api.post<{
            access_token: string;
            refresh_token: string;
            token_type: string;
            user: User;
        }>('/auth/refresh', { refresh_token: refreshToken }),
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

// Types
export interface User {
    id: string;
    email: string;
    phone?: string;
    full_name?: string;
    business_name?: string;
    gst_number?: string;
    user_type: 'B2B' | 'B2C';
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

export interface PaginatedProducts {
    items: Product[];
    total: number;
    page: number;
    page_size: number;
    pages: number;
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
    notes?: string;
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
