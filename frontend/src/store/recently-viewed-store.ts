import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '@/lib/api';

interface RecentlyViewedState {
    products: Product[];
    addProduct: (product: Product) => void;
    clear: () => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
    persist(
        (set, get) => ({
            products: [],
            addProduct: (newProduct) => {
                const currentProducts = get().products;
                // Remove the product if it already exists to avoid duplicates
                const filteredProducts = currentProducts.filter(p => p.id !== newProduct.id);
                // Add the new product to the beginning
                filteredProducts.unshift(newProduct);
                // Keep only the most recent 10
                set({ products: filteredProducts.slice(0, 10) });
            },
            clear: () => set({ products: [] }),
        }),
        {
            name: 'recently-viewed-storage',
        }
    )
);
