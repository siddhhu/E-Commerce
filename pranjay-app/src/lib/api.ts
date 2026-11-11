import { API_BASE_URL } from '@/src/config';
import { once, peek as peekCache, prime as primeCache, read as readCache, write as writeCache, isFresh } from '@/src/lib/cache';
import type {
    Address,
    Cart,
    Category,
    CartItem,
    AppBanner,
    HomeBootstrap,
    Order,
    OrderSummary,
    PaginatedOrders,
    PaginatedProducts,
    Product,
    ProductDetailBundle,
    ProductSummary,
    PromoCode,
    User,
    WishlistItem,
} from '@/src/lib/types';

const API_ROOT = `${API_BASE_URL.replace(/\/+$/, '')}/api/v1`;

const HOME_KEY = 'home';
const CATALOG_META_KEY = 'catalog-meta';
const CHECKOUT_PREP_KEY = 'checkout-prep';
const homeKey = (featured: number, discounted: number) => `${HOME_KEY}:${featured}:${discounted}`;
const productsKey = (params: QueryParams) => `products:${queryString(params)}`;
const detailKey = (slug: string) => `product-detail:${slug}`;
const searchKey = (query: string, page: number) => `search:${page}:${query.trim().toLowerCase()}`;

/** How long a cached payload is treated as good enough to skip a refetch entirely. */
const FRESH_MS = 60_000;
/** Product details change rarely; five minutes of instant opens is worth it. */
const DETAIL_FRESH_MS = 5 * 60_000;

type TokenProvider = () => string | null;
type RefreshHandler = () => Promise<string | null>;

let getAccessToken: TokenProvider = () => null;
let refreshAccessToken: RefreshHandler = async () => null;

export function configureApiAuth(provider: TokenProvider, refresher: RefreshHandler) {
    getAccessToken = provider;
    refreshAccessToken = refresher;
}

export function apiUrl(path: string): string {
    return `${API_ROOT}${path}`;
}

function friendlyNetworkError(error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error);
    if (/abort/i.test(message)) {
        return new Error('The request timed out. Check your connection and try again.');
    }
    return new Error('Cannot reach Pranjay right now. Check your internet connection and try again.');
}

async function parseError(response: Response): Promise<string> {
    try {
        const data = (await response.json()) as { detail?: string | Array<{ msg: string; loc?: string[] }> };
        if (typeof data.detail === 'string') return data.detail;
        if (Array.isArray(data.detail)) {
            return data.detail
                .map((e) => {
                    const field = e.loc?.filter((p) => p !== 'body').join('.');
                    return field ? `${field}: ${e.msg}` : e.msg;
                })
                .join(', ');
        }
    } catch {
        /* ignore */
    }
    if (response.status >= 500) return 'Pranjay is having trouble right now. Please try again in a moment.';
    return response.statusText || 'Request failed';
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(init.headers as Record<string, string> | undefined),
    };

    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);

    let response: Response;
    try {
        response = await fetch(`${API_ROOT}${path}`, {
            ...init,
            headers,
            signal: controller.signal,
        });
    } catch (error) {
        throw friendlyNetworkError(error);
    } finally {
        clearTimeout(timer);
    }

    if (response.status === 401 && retry) {
        const newToken = await refreshAccessToken();
        if (newToken) return request<T>(path, init, false);
        throw new Error('Your session expired. Please sign in again.');
    }

    if (!response.ok) throw new Error(await parseError(response));
    if (response.status === 204) return undefined as T;
    if (response.status === 201 || response.status === 200) {
        const text = await response.text();
        if (!text) return undefined as T;
        try {
            return JSON.parse(text) as T;
        } catch {
            throw new Error('Unexpected response from Pranjay. Please try again.');
        }
    }
    return response.json() as Promise<T>;
}

type UploadFile = { uri: string; name: string; mimeType: string };

function parseXhrError(xhr: XMLHttpRequest): string {
    try {
        const data = JSON.parse(xhr.responseText) as { detail?: string | Array<{ msg: string }> };
        if (typeof data.detail === 'string') return data.detail;
        if (Array.isArray(data.detail)) return data.detail.map((e) => e.msg).join(', ');
    } catch {
        /* ignore */
    }
    return xhr.status ? `Upload failed (${xhr.status})` : 'Network error. Check your connection and try again.';
}

/**
 * Multipart upload via React Native's XMLHttpRequest.
 * Expo's global fetch cannot send `{ uri, name, type }` file parts.
 */
function uploadMultipart<T>(path: string, file: UploadFile, retry = true): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const form = new FormData();
        form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_ROOT}${path}`);
        xhr.setRequestHeader('Accept', 'application/json');
        const token = getAccessToken();
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.timeout = 120_000;

        xhr.onload = () => {
            if (xhr.status === 401 && retry) {
                void refreshAccessToken().then((newToken) => {
                    if (!newToken) {
                        reject(new Error('Session expired. Please sign in again.'));
                        return;
                    }
                    uploadMultipart<T>(path, file, false).then(resolve, reject);
                });
                return;
            }
            if (xhr.status < 200 || xhr.status >= 300) {
                reject(new Error(parseXhrError(xhr)));
                return;
            }
            try {
                resolve(JSON.parse(xhr.responseText) as T);
            } catch {
                reject(new Error('Unexpected server response'));
            }
        };
        xhr.onerror = () => reject(new Error(parseXhrError(xhr)));
        xhr.ontimeout = () => reject(new Error('Upload timed out. Please try again.'));
        xhr.send(form);
    });
}

type QueryParams = Record<string, string | number | boolean | undefined | null>;

function queryString(params: QueryParams = {}): string {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') qs.set(key, String(value));
    });
    const value = qs.toString();
    return value ? `?${value}` : '';
}

export const api = {
    // ── Auth ────────────────────────────────────────────────────────────────
    verifyFirebase: (idToken: string) =>
        request<{ access_token: string; refresh_token: string; token_type: string; user: User }>(
            '/auth/verify-firebase',
            { method: 'POST', body: JSON.stringify({ id_token: idToken }) }
        ),

    refresh: (refreshToken: string) =>
        request<{ access_token: string; refresh_token: string; token_type: string; user: User }>(
            '/auth/refresh',
            { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }) }
        ),

    getMe: () => request<User>('/users/me'),

    updateProfile: (data: {
        full_name?: string;
        business_name?: string;
        contact_email?: string;
        gst_number?: string;
        user_type?: 'seller' | 'customer';
    }) => request<User>('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),

    uploadKycDocument: (file: UploadFile) =>
        uploadMultipart<{ document_url: string }>('/documents/kyc-upload', file),

    submitKyc: (data: { document_type: string; document_number: string; document_url: string }) =>
        request<User>('/users/me/kyc', { method: 'POST', body: JSON.stringify(data) }),

    uploadSellerDocument: (file: UploadFile) =>
        uploadMultipart<{ invoice_url: string }>('/invoices/upload', file),

    submitSellerApplication: (data: {
        invoice_url: string;
        bank_proof_url: string;
        bank_account_holder_name: string;
        bank_account_number: string;
        bank_ifsc: string;
        bank_name?: string;
    }) => request<User>('/users/me/seller-application', { method: 'POST', body: JSON.stringify(data) }),

    // ── Home / catalog ──────────────────────────────────────────────────────
    /** Cached + de-duplicated: repeat visits and tab switches never refetch blindly. */
    homeBootstrap: (featuredLimit = 12, discountedLimit = 12) => {
        const key = homeKey(featuredLimit, discountedLimit);
        return once(key, async () => {
            const data = await request<HomeBootstrap>(
                `/home/bootstrap?featured_limit=${featuredLimit}&discounted_limit=${discountedLimit}`
            );
            void writeCache(key, data);
            return data;
        });
    },
    peekHome: (featuredLimit = 12, discountedLimit = 12) =>
        peekCache<HomeBootstrap>(homeKey(featuredLimit, discountedLimit)),
    isHomeFresh: (featuredLimit = 12, discountedLimit = 12) =>
        isFresh(homeKey(featuredLimit, discountedLimit), FRESH_MS),

    /** Categories + brands only — cached for the session, filters reuse it. */
    catalogMeta: async () => {
        const cached = await readCache<{ categories: Category[]; brands: Array<{ id: string; name: string }> }>(
            CATALOG_META_KEY,
            30 * 60 * 1000
        );
        if (cached) return cached;
        return once(CATALOG_META_KEY, async () => {
            const res = await request<{
                categories: Category[];
                brands: Array<{ id: string; name: string; slug?: string }>;
                products: PaginatedProducts;
            }>('/products/catalog-bootstrap?page=1&page_size=1');
            const meta = { categories: res.categories, brands: res.brands };
            void writeCache(CATALOG_META_KEY, meta);
            return meta;
        });
    },
    peekCatalogMeta: () =>
        peekCache<{ categories: Category[]; brands: Array<{ id: string; name: string }> }>(CATALOG_META_KEY),

    /** Warm the caches during the splash so screens paint from disk instantly. */
    primeCaches: () => primeCache([homeKey(12, 12), CATALOG_META_KEY, CHECKOUT_PREP_KEY]),

    catalogBootstrap: (params: QueryParams = {}) =>
        request<{ categories: Category[]; brands: Array<{ id: string; name: string; slug?: string }>; products: PaginatedProducts }>(
            `/products/catalog-bootstrap${queryString(params)}`
        ),

    productDetail: (slug: string) => {
        const key = detailKey(slug);
        return once(key, async () => {
            const data = await request<ProductDetailBundle>(`/products/${encodeURIComponent(slug)}/detail`);
            void writeCache(key, data);
            return data;
        });
    },
    peekProductDetail: (slug: string) => peekCache<ProductDetailBundle>(detailKey(slug)),
    isProductDetailFresh: (slug: string) => isFresh(detailKey(slug), DETAIL_FRESH_MS),

    listProducts: (params: QueryParams = {}) => {
        const key = productsKey(params);
        return once(key, async () => {
            const data = await request<PaginatedProducts>(`/products${queryString(params)}`);
            void writeCache(key, data);
            return data;
        });
    },
    peekProducts: (params: QueryParams = {}) => peekCache<PaginatedProducts>(productsKey(params)),
    isProductsFresh: (params: QueryParams = {}) => isFresh(productsKey(params), FRESH_MS),

    /**
     * Warm the shop tab while the user is still on the home screen, so tapping
     * the tab paints products immediately instead of waiting ~2s per endpoint.
     */
    prefetchShop: () => {
        void api.catalogMeta().catch(() => undefined);
        void api.listProducts({ page: 1, page_size: 20 }).catch(() => undefined);
    },

    /**
     * Cached per query: search costs ~2s server-side, so retyping a word you
     * already looked for should paint instantly instead of hitting the network.
     */
    searchProducts: (query: string, page = 1) => {
        const key = searchKey(query, page);
        return once(key, async () => {
            const data = await request<PaginatedProducts>(`/products${queryString({
                search: query,
                page,
                page_size: 24,
            })}`);
            void writeCache(key, data);
            return data;
        });
    },
    peekSearch: (query: string, page = 1) => peekCache<PaginatedProducts>(searchKey(query, page)),
    isSearchFresh: (query: string, page = 1) => isFresh(searchKey(query, page), FRESH_MS),

    listPromoCodes: () => request<PromoCode[]>('/promo-codes/active'),

    validatePromo: (code: string, subtotal: number) =>
        request<{ code: string; discount_amount: number }>('/promo-codes/validate', {
            method: 'POST',
            body: JSON.stringify({ code, subtotal }),
        }),

    // ── Cart ────────────────────────────────────────────────────────────────
    getCart: () => request<Cart>('/cart'),
    addToCart: (productId: string, quantity = 1) =>
        request<CartItem>('/cart/items', {
            method: 'POST',
            body: JSON.stringify({ product_id: productId, quantity }),
        }),
    updateCartItem: (itemId: string, quantity: number) =>
        request<CartItem>(`/cart/items/${itemId}`, {
            method: 'PATCH',
            body: JSON.stringify({ quantity }),
        }),
    removeCartItem: (itemId: string) =>
        request<void>(`/cart/items/${itemId}`, { method: 'DELETE' }),
    clearCart: () => request<void>('/cart', { method: 'DELETE' }),

    // ── Checkout ────────────────────────────────────────────────────────────
    getCheckoutPrep: () =>
        once(CHECKOUT_PREP_KEY, async () => {
            const data = await request<{ addresses: Address[]; cart: Cart }>('/checkout-prep');
            void writeCache(CHECKOUT_PREP_KEY, data);
            return data;
        }),
    peekCheckoutPrep: () => peekCache<{ addresses: Address[]; cart: Cart }>(CHECKOUT_PREP_KEY),
    /** Called when the cart opens so checkout has addresses ready before it mounts. */
    warmCheckout: () => {
        void api.getCheckoutPrep().catch(() => undefined);
    },

    prepareCheckout: (data: { cart_items: { product_id: string; quantity: number }[]; promo_code?: string }) =>
        request<{ razorpay_order_id: string; amount_paise: number; amount_display: number }>(
            '/checkout/prepare',
            { method: 'POST', body: JSON.stringify(data) }
        ),

    completeCheckout: (data: {
        full_name: string;
        phone: string;
        address_line1: string;
        address_line2?: string;
        city: string;
        state: string;
        postal_code: string;
        country?: string;
        existing_address_id?: string;
        cart_items: { product_id: string; quantity: number }[];
        payment_method: 'cod' | 'online';
        notes?: string;
        promo_code?: string;
        razorpay_payment_id?: string;
        razorpay_order_id?: string;
        razorpay_signature?: string;
    }) => request<Order>('/checkout/complete', { method: 'POST', body: JSON.stringify(data) }),

    // ── Addresses ───────────────────────────────────────────────────────────
    getAddresses: () => request<Address[]>('/users/me/addresses'),

    createAddress: (data: {
        label?: string;
        full_name: string;
        phone: string;
        address_line1: string;
        address_line2?: string;
        city: string;
        state: string;
        postal_code: string;
        country?: string;
        is_default?: boolean;
    }) => request<Address>('/users/me/addresses', { method: 'POST', body: JSON.stringify(data) }),

    updateAddress: (id: string, data: Partial<Omit<Address, 'id' | 'user_id' | 'created_at'>>) =>
        request<Address>(`/users/me/addresses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

    deleteAddress: (id: string) =>
        request<void>(`/users/me/addresses/${id}`, { method: 'DELETE' }),

    // ── Wishlist ────────────────────────────────────────────────────────────
    getWishlist: () => request<WishlistItem[]>('/wishlist'),
    addWishlist: (productId: string) =>
        request<{ id: string }>('/wishlist', {
            method: 'POST',
            body: JSON.stringify({ product_id: productId }),
        }),
    removeWishlist: (itemId: string) =>
        request<void>(`/wishlist/${itemId}`, { method: 'DELETE' }),
    moveWishlistToCart: (itemId: string) =>
        request<{ message: string }>(`/wishlist/${itemId}/move-to-cart`, { method: 'POST' }),

    // ── Orders ──────────────────────────────────────────────────────────────
    listOrders: (page = 1, pageSize = 20) =>
        once(`orders:${page}:${pageSize}`, () =>
            request<PaginatedOrders>(`/orders?page=${page}&page_size=${pageSize}`)
        ),
    getOrder: (id: string) => request<Order>(`/orders/${id}`),
    cancelOrder: (id: string) => request<Order>(`/orders/${id}/cancel`, { method: 'POST' }),
};

export type { Product, ProductSummary, OrderSummary, AppBanner };
