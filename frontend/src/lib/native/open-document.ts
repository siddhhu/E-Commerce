import { getCapacitorPlugins } from '@/lib/native/capacitor-bridge';
import { isNativeApp } from '@/lib/is-native-app';
import { isMobileWebView } from '@/lib/is-mobile-webview';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

function triggerAnchorDownload(blobUrl: string, filename: string) {
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = filename;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
}

async function shareOrOpenUrl(url: string, title: string): Promise<boolean> {
    try {
        const nativeShare = getCapacitorPlugins()?.Share;
        if (nativeShare) {
            await nativeShare.share({ title, url, dialogTitle: title });
            return true;
        }
    } catch {
        // fall through
    }

    if (typeof navigator !== 'undefined' && navigator.share) {
        try {
            await navigator.share({ title, url });
            return true;
        } catch {
            // fall through
        }
    }

    return false;
}

/**
 * Download or open a PDF invoice — works in Play Store WebView wrappers and browsers.
 */
export async function downloadOrderInvoice(
    orderId: string,
    orderNumber: string,
    fallbackUrl?: string | null
): Promise<void> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const filename = `${orderNumber}-invoice.pdf`;
    const mobile = isMobileWebView();

    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/orders/${orderId}/invoice`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
            throw new Error('Invoice is not available yet. Please try again in a moment.');
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        if (mobile) {
            // WebView: navigate to blob — opens the device PDF viewer
            window.location.assign(blobUrl);
            window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
            return;
        }

        if (isNativeApp()) {
            const shared = await shareOrOpenUrl(blobUrl, `Invoice ${orderNumber}`);
            if (shared) {
                window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
                return;
            }
        }

        triggerAnchorDownload(blobUrl, filename);
        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (error) {
        if (fallbackUrl) {
            if (mobile || isNativeApp()) {
                window.location.assign(fallbackUrl);
                return;
            }
            const opened = await shareOrOpenUrl(fallbackUrl, `Invoice ${orderNumber}`);
            if (opened) return;
            window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
            return;
        }
        throw error;
    }
}

export async function openDocumentUrl(url: string, title: string): Promise<void> {
    if (!url) return;

    if (isMobileWebView() || isNativeApp()) {
        const shared = await shareOrOpenUrl(url, title);
        if (shared) return;
        window.location.assign(url);
        return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
}
