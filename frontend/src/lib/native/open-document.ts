import { getCapacitorPlugins } from '@/lib/native/capacitor-bridge';
import { isNativeApp } from '@/lib/is-native-app';

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

function openBlobInNewTab(blobUrl: string) {
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Download or open a PDF invoice — works in Capacitor WebView and regular browsers.
 * Uses authenticated same-origin API so WebView is not blocked by cross-origin download rules.
 */
export async function downloadOrderInvoice(orderId: string, orderNumber: string): Promise<void> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const response = await fetch(`${API_BASE_URL}/api/v1/orders/${orderId}/invoice`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
        throw new Error('Invoice is not available yet. Please try again in a moment.');
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const filename = `${orderNumber}-invoice.pdf`;

    try {
        if (isNativeApp()) {
            try {
                await getCapacitorPlugins()?.Share?.share({
                    title: `Invoice ${orderNumber}`,
                    url: blobUrl,
                    dialogTitle: 'Open or save invoice',
                });
                return;
            } catch {
                // Share cancelled or unsupported — fall through
            }
        }

        triggerAnchorDownload(blobUrl, filename);

        if (isNativeApp()) {
            openBlobInNewTab(blobUrl);
        }
    } finally {
        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    }
}

/**
 * Open any document URL — native share sheet or new browser tab on web.
 */
export async function openDocumentUrl(url: string, title: string): Promise<void> {
    if (!url) return;

    if (isNativeApp()) {
        try {
            await getCapacitorPlugins()?.Share?.share({
                title,
                url,
                dialogTitle: title,
            });
            return;
        } catch {
            window.open(url, '_blank', 'noopener,noreferrer');
            return;
        }
    }

    window.open(url, '_blank', 'noopener,noreferrer');
}
