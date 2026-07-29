'use client';

import { create } from 'zustand';
import { productsApi, SearchIndexItem } from '@/lib/api';

const SEARCH_INDEX_STORAGE_KEY = 'pranjay-search-index';
const SEARCH_INDEX_TTL_MS = 5 * 60 * 1000;

interface StoredSearchIndex {
    savedAt: number;
    items: SearchIndexItem[];
}

function readStoredIndex(): SearchIndexItem[] | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(SEARCH_INDEX_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as StoredSearchIndex;
        if (!parsed?.items || Date.now() - parsed.savedAt > SEARCH_INDEX_TTL_MS) {
            sessionStorage.removeItem(SEARCH_INDEX_STORAGE_KEY);
            return null;
        }
        return parsed.items;
    } catch {
        return null;
    }
}

function writeStoredIndex(items: SearchIndexItem[]) {
    if (typeof window === 'undefined') return;
    try {
        const payload: StoredSearchIndex = { savedAt: Date.now(), items };
        sessionStorage.setItem(SEARCH_INDEX_STORAGE_KEY, JSON.stringify(payload));
    } catch {
        // Ignore quota errors — network fetch still works.
    }
}

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

        const cached = readStoredIndex();
        if (cached) {
            set({ index: cached, isLoaded: true });
            return;
        }

        set({ isLoading: true });
        try {
            const items = await productsApi.getSearchIndex();
            writeStoredIndex(items);
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

        const tokens = query
            .toLowerCase()
            .split(/\s+/)
            .filter((t) => t.length > 0);

        if (tokens.length === 0) return [];

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

        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, 8).map((s) => s.item);
    },
}));
