import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type { ProductSummary } from '@/src/lib/types';

const RECENT_KEY = 'pranjay_recently_viewed_v1';
const SEARCH_KEY = 'pranjay_recent_searches_v1';
const MAX_RECENT = 10;
const MAX_SEARCHES = 8;

interface RecentState {
    products: ProductSummary[];
    searches: string[];
    hydrated: boolean;
    hydrate: () => Promise<void>;
    addProduct: (product: ProductSummary) => void;
    addSearch: (query: string) => void;
    clearSearches: () => void;
}

export const useRecentStore = create<RecentState>((set, get) => ({
    products: [],
    searches: [],
    hydrated: false,

    hydrate: async () => {
        try {
            const [productsJson, searchesJson] = await Promise.all([
                AsyncStorage.getItem(RECENT_KEY),
                AsyncStorage.getItem(SEARCH_KEY),
            ]);
            set({
                products: productsJson ? (JSON.parse(productsJson) as ProductSummary[]) : [],
                searches: searchesJson ? (JSON.parse(searchesJson) as string[]) : [],
                hydrated: true,
            });
        } catch {
            set({ hydrated: true });
        }
    },

    addProduct: (product) => {
        const next = [product, ...get().products.filter((p) => p.id !== product.id)].slice(0, MAX_RECENT);
        set({ products: next });
        void AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
    },

    addSearch: (query) => {
        const value = query.trim();
        if (value.length < 2) return;
        const next = [value, ...get().searches.filter((q) => q.toLowerCase() !== value.toLowerCase())].slice(0, MAX_SEARCHES);
        set({ searches: next });
        void AsyncStorage.setItem(SEARCH_KEY, JSON.stringify(next));
    },

    clearSearches: () => {
        set({ searches: [] });
        void AsyncStorage.removeItem(SEARCH_KEY);
    },
}));
