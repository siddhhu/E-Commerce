import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '@/lib/dummy-data';

interface WishlistState {
    items: Product[];

    // Actions
    addItem: (product: Product) => void;
    removeItem: (productId: string) => void;
    isInWishlist: (productId: string) => boolean;
    clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>()(
    persist(
        (set, get) => ({
            items: [],

            addItem: (product) => {
                set((state) => {
                    const exists = state.items.some(item => item.id === product.id);
                    if (exists) return state;
                    return { items: [...state.items, product] };
                });
            },

            removeItem: (productId) => {
                set((state) => ({
                    items: state.items.filter(item => item.id !== productId)
                }));
            },

            isInWishlist: (productId) => {
                return get().items.some(item => item.id === productId);
            },

            clearWishlist: () => {
                set({ items: [] });
            },
        }),
        {
            name: 'pranjay-wishlist',
        }
    )
);
