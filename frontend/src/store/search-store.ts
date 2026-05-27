'use client';

import { create } from 'zustand';
import { productsApi, SearchIndexItem } from '@/lib/api';

interface SearchStore {
    index: SearchIndexItem[];
    isLoaded: boolean;
    isLoading: boolean;
    loadIndex: () => Promise<void>;
    search: (query: string) => SearchIndexItem[];
}

export const useSearchStore = create<SearchStore>((set, get) => ({
    index: [],
    isLoaded: false,
    isLoading: false,

    loadIndex: async () => {
        const { isLoaded, isLoading } = get();
        if (isLoaded || isLoading) return;

        set({ isLoading: true });
        try {
            const items = await productsApi.getSearchIndex();
            set({ index: items, isLoaded: true });
        } catch (err) {
            console.error('Failed to load search index:', err);
        } finally {
            set({ isLoading: false });
        }
    },

    search: (query: string): SearchIndexItem[] => {
        const { index } = get();
        if (!query.trim()) return [];

        // Tokenize query into lowercase words
        const tokens = query
            .toLowerCase()
            .split(/\s+/)
            .filter((t) => t.length > 0);

        if (tokens.length === 0) return [];

        // For each product, check if ALL tokens match somewhere
        const scored = index
            .map((item) => {
                const haystack = [
                    item.name,
                    item.sku,
                    item.short_description,
                    item.seller_name,
                ].join(' ').toLowerCase();

                const allMatch = tokens.every((token) => haystack.includes(token));
                if (!allMatch) return null;

                // Score: prefer name matches, then exact prefix matches
                let score = 0;
                const nameLower = item.name.toLowerCase();
                for (const token of tokens) {
                    if (nameLower.startsWith(token)) score += 10;
                    else if (nameLower.includes(token)) score += 5;
                    else score += 1;
                }
                return { item, score };
            })
            .filter(Boolean) as { item: SearchIndexItem; score: number }[];

        // Sort by score descending, limit to 8 results
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, 8).map((s) => s.item);
    },
}));
