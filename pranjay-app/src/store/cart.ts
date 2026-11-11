import { create } from 'zustand';
import { api } from '@/src/lib/api';
import type { Cart, CartItem } from '@/src/lib/types';
import { useAuthStore } from '@/src/store/auth';

const EMPTY_CART: Cart = { items: [], items_count: 0, subtotal: 0, currency: 'INR' };

interface AppliedPromo {
    code: string;
    discount: number;
}

interface CartState {
    cart: Cart;
    promo: AppliedPromo | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<Cart>;
    add: (productId: string, quantity?: number) => Promise<void>;
    setQuantity: (item: CartItem, quantity: number) => Promise<void>;
    remove: (item: CartItem) => Promise<void>;
    clear: () => Promise<void>;
    applyPromo: (code: string) => Promise<AppliedPromo>;
    clearPromo: () => void;
    reset: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
    cart: EMPTY_CART,
    promo: null,
    loading: false,
    error: null,

    refresh: async () => {
        if (!useAuthStore.getState().isAuthenticated()) {
            set({ cart: EMPTY_CART, loading: false, error: null });
            return EMPTY_CART;
        }
        set({ loading: true, error: null });
        try {
            const cart = await api.getCart();
            set({ cart, loading: false });
            return cart;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Could not load your cart';
            set({ loading: false, error: message });
            throw error;
        }
    },

    add: async (productId, quantity = 1) => {
        // The POST returns the full item, so update locally and reconcile off the
        // user's critical path instead of blocking on a second cart GET.
        const item = await api.addToCart(productId, quantity);
        set((state) => {
            const items = state.cart.items.some((i) => i.id === item.id)
                ? state.cart.items.map((i) => (i.id === item.id ? item : i))
                : [...state.cart.items, item];
            return {
                cart: {
                    ...state.cart,
                    items,
                    items_count: items.reduce((n, i) => n + i.quantity, 0),
                    subtotal: items.reduce((n, i) => n + i.total_price, 0),
                },
            };
        });
        void get().refresh().catch(() => undefined);
    },

    setQuantity: async (item, quantity) => {
        if (quantity <= 0) {
            await get().remove(item);
            return;
        }
        // Optimistic count so the stepper feels instant on slow networks.
        set((state) => {
            const items = state.cart.items.map((i) =>
                i.id === item.id ? { ...i, quantity, total_price: i.unit_price * quantity } : i
            );
            return {
                cart: {
                    ...state.cart,
                    items,
                    items_count: items.reduce((n, i) => n + i.quantity, 0),
                    subtotal: items.reduce((n, i) => n + i.total_price, 0),
                },
            };
        });
        try {
            await api.updateCartItem(item.id, quantity);
        } finally {
            void get().refresh().catch(() => undefined);
        }
    },

    remove: async (item) => {
        set((state) => {
            const items = state.cart.items.filter((i) => i.id !== item.id);
            return {
                cart: {
                    ...state.cart,
                    items,
                    items_count: items.reduce((n, i) => n + i.quantity, 0),
                    subtotal: items.reduce((n, i) => n + i.total_price, 0),
                },
            };
        });
        await api.removeCartItem(item.id);
        void get().refresh().catch(() => undefined);
    },

    clear: async () => {
        await api.clearCart();
        set({ cart: EMPTY_CART, promo: null });
    },

    applyPromo: async (code) => {
        const subtotal = get().cart.subtotal;
        const result = await api.validatePromo(code.trim().toUpperCase(), subtotal);
        const applied = { code: result.code, discount: result.discount_amount };
        set({ promo: applied });
        return applied;
    },

    clearPromo: () => set({ promo: null }),

    reset: () => set({ cart: EMPTY_CART, promo: null, loading: false, error: null }),
}));
