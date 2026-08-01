import { getCapacitorPlugins } from '@/lib/native/capacitor-bridge';

export interface SharePayload {
    title: string;
    text?: string;
    url: string;
}

/** Native share sheet (Capacitor) with web Share API and clipboard fallback. */
export async function shareContent(payload: SharePayload): Promise<'shared' | 'copied' | 'cancelled'> {
    const { title, text, url } = payload;

    try {
        const nativeShare = getCapacitorPlugins()?.Share;
        if (nativeShare) {
            await nativeShare.share({ title, text, url, dialogTitle: 'Share product' });
            return 'shared';
        }

        if (typeof navigator !== 'undefined' && navigator.share) {
            await navigator.share({ title, text, url });
            return 'shared';
        }

        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(url);
            return 'copied';
        }
    } catch {
        return 'cancelled';
    }

    return 'cancelled';
}
