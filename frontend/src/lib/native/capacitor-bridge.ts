/**
 * Typed access to Capacitor plugins injected at runtime by the native shell.
 * The web bundle does not import @capacitor/* — plugins load only inside the APK/IPA.
 */

type PluginListener = { remove: () => void };

export type CapacitorPlugins = {
    App?: {
        addListener: (
            event: 'backButton' | 'appStateChange' | 'pause' | 'resume',
            handler: (data: { canGoBack?: boolean; isActive?: boolean }) => void
        ) => PluginListener;
        exitApp: () => Promise<void>;
        minimizeApp: () => Promise<void>;
    };
    Haptics?: {
        impact: (opts: { style: 'LIGHT' | 'MEDIUM' | 'HEAVY' }) => Promise<void>;
        notification: (opts: { type: 'SUCCESS' | 'WARNING' | 'ERROR' }) => Promise<void>;
    };
    Keyboard?: {
        addListener: (
            event: 'keyboardWillShow' | 'keyboardWillHide' | 'keyboardDidShow' | 'keyboardDidHide',
            handler: () => void
        ) => PluginListener;
        setScroll: (opts: { isDisabled: boolean }) => Promise<void>;
    };
    Network?: {
        getStatus: () => Promise<{ connected: boolean; connectionType: string }>;
        addListener: (
            event: 'networkStatusChange',
            handler: (status: { connected: boolean; connectionType: string }) => void
        ) => PluginListener;
    };
    Share?: {
        share: (opts: { title?: string; text?: string; url?: string; dialogTitle?: string }) => Promise<void>;
    };
    SplashScreen?: {
        hide: (opts?: { fadeOutDuration?: number }) => Promise<void>;
    };
    StatusBar?: {
        setStyle: (opts: { style: 'DARK' | 'LIGHT' | 'DEFAULT' }) => Promise<void>;
        setBackgroundColor: (opts: { color: string }) => Promise<void>;
    };
    Preferences?: {
        get: (opts: { key: string }) => Promise<{ value: string | null }>;
        set: (opts: { key: string; value: string }) => Promise<void>;
        remove: (opts: { key: string }) => Promise<void>;
    };
};

export function getCapacitorPlugins(): CapacitorPlugins | undefined {
    if (typeof window === 'undefined') return undefined;
    return (window as Window & { Capacitor?: { Plugins?: CapacitorPlugins } }).Capacitor?.Plugins;
}

export function hasCapacitorPlugin<K extends keyof CapacitorPlugins>(name: K): boolean {
    return Boolean(getCapacitorPlugins()?.[name]);
}
