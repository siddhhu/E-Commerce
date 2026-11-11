import { create } from 'zustand';
import { api } from '@/src/lib/api';
import type { WishlistItem } from '@/src/lib/types';
import { useAuthStore } from '@/src/store/auth';

interface WishlistState {
    items: WishlistItem[];
    loading: boolean;
    loaded: boolean;
    load: (force?: boolean) => Promise<void>;
    has: (productId: string) => boolean;
    toggle: (productId: string) => Promise<boolean>;
    removeItem: (itemId: string) => Promise<void>;
    moveToCart: (itemId: string) => Promise<void>;
    reset: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
    items: [],
    loading: false,
    loaded: false,

    load: async (force = false) => {
        if (!useAuthStore.getState().isAuthenticated()) {
            set({ items: [], loaded: true });
            return;
        }
        if (get().loaded && !force) return;
        set({ loading: true });
        try {
            const items = await api.getWishlist();
            set({ items, loaded: true, loading: false });
        } catch {
            set({ loading: false, loaded: true });
        }
    },

    has: (productId) => get().items.some((item) => item.product_id === productId),

    toggle: async (productId) => {
        const existing = get().items.find((item) => item.product_id === productId);
        if (existing) {
            set((state) => ({ items: state.items.filter((item) => item.id !== existing.id) }));
            try {
                await api.removeWishlist(existing.id);
            } catch (error) {
                set((state) => ({ items: [...state.items, existing] }));
                throw error;
            }
            return false;
        }

        const created = await api.addWishlist(productId);
        // Optimistic placeholder until the next full load fills product details.
        set((state) => ({
            items: [
                ...state.items,
                {
                    id: created.id,
                    product_id: productId,
                    product_name: '',
                    product_slug: '',
                    product_sku: '',
                    selling_price: 0,
                    mrp: 0,
                    primary_image: null,
                    is_in_stock: true,
                },
            ],
        }));
        void get().load(true);
        return true;
    },

    removeItem: async (itemId) => {
        const snapshot = get().items;
        set({ items: snapshot.filter((item) => item.id !== itemId) });
        try {
            await api.removeWishlist(itemId);
        } catch (error) {
            set({ items: snapshot });
            throw error;
        }
    },

    moveToCart: async (itemId) => {
        await api.moveWishlistToCart(itemId);
        set((state) => ({ items: state.items.filter((item) => item.id !== itemId) }));
    },

    reset: () => set({ items: [], loaded: false, loading: false }),
}));
