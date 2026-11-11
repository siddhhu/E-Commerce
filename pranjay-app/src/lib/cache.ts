import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'pranjay.cache.v1.';
const memory = new Map<string, { data: unknown; at: number }>();
const inflight = new Map<string, Promise<unknown>>();

/** Synchronous read of the last payload held in memory (survives tab switches). */
export function peek<T>(key: string): T | null {
    const entry = memory.get(key);
    return entry ? (entry.data as T) : null;
}

/** Read from memory, then disk. Returns null when missing or older than maxAgeMs. */
export async function read<T>(key: string, maxAgeMs: number): Promise<T | null> {
    const hit = memory.get(key);
    if (hit) {
        return Date.now() - hit.at > maxAgeMs ? null : (hit.data as T);
    }
    try {
        const raw = await AsyncStorage.getItem(PREFIX + key);
        if (!raw) return null;
        const entry = JSON.parse(raw) as { data: T; at: number };
        if (!entry || typeof entry.at !== 'number') return null;
        memory.set(key, { data: entry.data, at: entry.at });
        return Date.now() - entry.at > maxAgeMs ? null : entry.data;
    } catch {
        return null;
    }
}

export async function write<T>(key: string, data: T): Promise<void> {
    const entry = { data, at: Date.now() };
    memory.set(key, entry);
    try {
        await AsyncStorage.setItem(PREFIX + key, JSON.stringify(entry));
    } catch {
        /* disk cache is best effort */
    }
}

/** Load persisted entries into memory at startup so first paint can read them synchronously. */
export async function prime(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => read(key, Number.POSITIVE_INFINITY)));
}

/** Milliseconds since the cached entry was written, or null when it is absent. */
export function age(key: string): number | null {
    const entry = memory.get(key);
    return entry ? Date.now() - entry.at : null;
}

/** True when a usable copy is already in memory and younger than maxAgeMs. */
export function isFresh(key: string, maxAgeMs: number): boolean {
    const value = age(key);
    return value !== null && value <= maxAgeMs;
}

/** Collapse identical in-flight requests (double taps, duplicate screens). */
export function once<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const running = inflight.get(key) as Promise<T> | undefined;
    if (running) return running;
    const promise = fn().finally(() => inflight.delete(key));
    inflight.set(key, promise);
    return promise;
}
