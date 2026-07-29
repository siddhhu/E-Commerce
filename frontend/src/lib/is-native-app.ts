/**
 * Detect if the app is running inside a Capacitor native shell (Android/iOS).
 * Capacitor injects `window.Capacitor` at runtime — no npm import required on web.
 */
export function isNativeApp(): boolean {
    if (typeof window === 'undefined') return false;
    const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    return cap?.isNativePlatform?.() ?? false;
}

export function isAndroidApp(): boolean {
    if (typeof window === 'undefined') return false;
    const cap = (window as Window & { Capacitor?: { getPlatform?: () => string } }).Capacitor;
    return cap?.getPlatform?.() === 'android';
}
