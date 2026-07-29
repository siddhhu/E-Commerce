/**
 * Client-side GET cache: fewer round-trips, deduped in-flight requests.
 * Public catalog endpoints only — never cache auth/user/cart routes.
 */

const memory = new Map<string, { data: unknown; expires: number }>();
const inflight = new Map<string, Promise<unknown>>();

const TTL_RULES: Array<{ test: (path: string) => boolean; ttlMs: number }> = [
    { test: (p) => p.startsWith('/home/bootstrap'), ttlMs: 60_000 },
    { test: (p) => p.startsWith('/products/catalog-bootstrap'), ttlMs: 60_000 },
    { test: (p) => p.includes('/detail'), ttlMs: 120_000 },
    { test: (p) => p.startsWith('/products/featured'), ttlMs: 120_000 },
    { test: (p) => p.startsWith('/products/discounted-featured'), ttlMs: 120_000 },
    { test: (p) => p.startsWith('/products/brands'), ttlMs: 300_000 },
    { test: (p) => p.startsWith('/products/search-index'), ttlMs: 300_000 },
    { test: (p) => p.startsWith('/products?'), ttlMs: 60_000 },
    { test: (p) => /^\/products\/[^/?]+$/.test(p.split('?')[0]), ttlMs: 120_000 },
    { test: (p) => p.startsWith('/categories'), ttlMs: 300_000 },
    { test: (p) => p.startsWith('/banners'), ttlMs: 300_000 },
    { test: (p) => p.startsWith('/promo-codes/active'), ttlMs: 60_000 },
];

function cacheTtlForEndpoint(endpoint: string): number | null {
    const path = endpoint.split('?')[0];
    for (const rule of TTL_RULES) {
        if (rule.test(path) || rule.test(endpoint)) return rule.ttlMs;
    }
    return null;
}

function storageKey(endpoint: string): string {
    return `pranjay-api:${endpoint}`;
}

function readStorage<T>(key: string, ttlMs: number): T | null {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { t: number; d: T };
        if (Date.now() - parsed.t > ttlMs) {
            sessionStorage.removeItem(key);
            return null;
        }
        return parsed.d;
    } catch {
        return null;
    }
}

function writeStorage(key: string, data: unknown): void {
    try {
        sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), d: data }));
    } catch {
        // Quota exceeded — ignore
    }
}

export async function cachedGet<T>(
    endpoint: string,
    fetcher: () => Promise<T>
): Promise<T> {
    const ttlMs = cacheTtlForEndpoint(endpoint);
    if (!ttlMs) return fetcher();

    const now = Date.now();
    const mem = memory.get(endpoint);
    if (mem && mem.expires > now) {
        return mem.data as T;
    }

    if (typeof window !== 'undefined') {
        const stored = readStorage<T>(storageKey(endpoint), ttlMs);
        if (stored !== null) {
            memory.set(endpoint, { data: stored, expires: now + ttlMs });
            return stored;
        }
    }

    const pending = inflight.get(endpoint);
    if (pending) return pending as Promise<T>;

    const task = fetcher()
        .then((data) => {
            memory.set(endpoint, { data, expires: Date.now() + ttlMs });
            if (typeof window !== 'undefined') {
                writeStorage(storageKey(endpoint), data);
            }
            inflight.delete(endpoint);
            return data;
        })
        .catch((err) => {
            inflight.delete(endpoint);
            throw err;
        });

    inflight.set(endpoint, task);
    return task;
}

export function primeApiCache(endpoint: string, data: unknown, ttlMs = 60_000): void {
    memory.set(endpoint, { data, expires: Date.now() + ttlMs });
    if (typeof window !== 'undefined') {
        writeStorage(storageKey(endpoint), data);
    }
}

export function invalidateApiCache(prefix = ''): void {
    memory.forEach((_, key) => {
        if (!prefix || key.startsWith(prefix)) memory.delete(key);
    });
    if (typeof window !== 'undefined') {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const k = sessionStorage.key(i);
            if (k?.startsWith('pranjay-api:') && (!prefix || k.includes(prefix))) {
                sessionStorage.removeItem(k);
            }
        }
    }
}
