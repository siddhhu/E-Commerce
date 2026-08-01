/** Backend host for server-side fetches (SSR / Vercel build). No /api/v1 suffix. */
export function getServerApiBaseUrl(): string {
    const raw =
        process.env.BACKEND_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        'http://localhost:8000';

    return raw.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
}

/** Safe JSON fetch — returns null on network errors, non-OK, or HTML responses. */
export async function fetchServerJson<T>(url: string, init?: RequestInit): Promise<T | null> {
    try {
        const res = await fetch(url, init);
        if (!res.ok) return null;

        const contentType = res.headers.get('content-type') ?? '';
        if (!contentType.includes('application/json')) return null;

        return (await res.json()) as T;
    } catch {
        return null;
    }
}
