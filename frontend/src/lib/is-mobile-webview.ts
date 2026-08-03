/**
 * Detect phone/tablet WebViews — including Play Store apps that wrap pranjay.com
 * without injecting Capacitor. Used for upload + download workarounds.
 */
export function isMobileWebView(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

    const ua = navigator.userAgent || '';

    // Capacitor shell
    const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (cap?.isNativePlatform?.()) return true;

    // Android WebView (common in Play Store wrapper apps)
    if (/Android/i.test(ua)) {
        if (/;\s*wv\)/i.test(ua) || /Version\/[\d.]+/i.test(ua)) return true;
        // Phone/tablet heuristic
        if (window.matchMedia('(pointer: coarse)').matches) return true;
    }

    // iOS WebView / PWA standalone
    if (/iPhone|iPad|iPod/i.test(ua)) {
        const standalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
        if (standalone) return true;
        if (!/Safari/i.test(ua) && /AppleWebKit/i.test(ua)) return true;
    }

    return false;
}

export function isAndroidWebView(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return /Android/i.test(ua);
}

/** True on phones, tablets, and in-app WebViews (Play Store wrapper). */
export function isTouchDevice(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

    const ua = navigator.userAgent || '';

    if (isMobileWebView()) return true;

    if (isAndroidWebView() && window.matchMedia('(max-width: 1024px)').matches) return true;

    if (window.matchMedia('(pointer: coarse)').matches) return true;

    return /iPhone|iPad|iPod|Android/i.test(ua);
}
