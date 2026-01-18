/**
 * API Service for connecting frontend to backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface APIProduct {
    id: string;
    name: string;
    slug: string;
    sku: string;
    short_description: string;
    mrp: number;
    selling_price: number;
    b2b_price: number;
    stock_quantity: number;
    is_featured: boolean;
    primary_image: string | null;
}

export interface APIProductDetail {
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
    unit: string;
    is_active: boolean;
    is_featured: boolean;
    category_id: string;
    brand_id: string;
    images: { id: string; image_url: string; alt_text: string; is_primary: boolean }[];
    category?: { id: string; name: string; slug: string };
    brand?: { id: string; name: string; slug: string };
}

export interface PaginatedProducts {
    items: APIProduct[];
    total: number;
    page: number;
    page_size: number;
    pages: number;
}

export interface APICategory {
    id: string;
    name: string;
    slug: string;
    description: string;
    image_url: string | null;
    is_active: boolean;
}

export interface APIBrand {
    id: string;
    name: string;
    slug: string;
    description: string;
    logo_url: string | null;
    is_active: boolean;
}

class APIService {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    // Products
    async getProducts(params?: {
        page?: number;
        page_size?: number;
        category_id?: string;
        brand_id?: string;
        search?: string;
        is_featured?: boolean;
    }): Promise<PaginatedProducts> {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set('page', params.page.toString());
        if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
        if (params?.category_id) searchParams.set('category_id', params.category_id);
        if (params?.brand_id) searchParams.set('brand_id', params.brand_id);
        if (params?.search) searchParams.set('search', params.search);
        if (params?.is_featured !== undefined) searchParams.set('is_featured', params.is_featured.toString());

        const query = searchParams.toString();
        return this.fetch<PaginatedProducts>(`/api/v1/products${query ? `?${query}` : ''}`);
    }

    async getFeaturedProducts(limit: number = 10): Promise<APIProduct[]> {
        return this.fetch<APIProduct[]>(`/api/v1/products/featured?limit=${limit}`);
    }

    async getProductBySlug(slug: string): Promise<APIProductDetail> {
        return this.fetch<APIProductDetail>(`/api/v1/products/${slug}`);
    }

    // Categories
    async getCategories(): Promise<APICategory[]> {
        return this.fetch<APICategory[]>('/api/v1/categories');
    }

    async getCategoryBySlug(slug: string): Promise<APICategory> {
        return this.fetch<APICategory>(`/api/v1/categories/${slug}`);
    }

    // Brands
    async getBrands(): Promise<APIBrand[]> {
        return this.fetch<APIBrand[]>('/api/v1/brands');
    }

    // Search
    async searchProducts(query: string): Promise<PaginatedProducts> {
        return this.getProducts({ search: query });
    }
}

export const apiService = new APIService();
export default apiService;
