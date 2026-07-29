/**
 * Light haptic feedback on native (Capacitor). No-op on regular web browsers.
 */
export async function hapticLight(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
        const plugins = (window as Window & {
            Capacitor?: { Plugins?: { Haptics?: { impact: (opts: { style: string }) => Promise<void> } } };
        }).Capacitor?.Plugins;
        await plugins?.Haptics?.impact({ style: 'LIGHT' });
    } catch {
        // Haptics unavailable — ignore
    }
}

export async function hapticSuccess(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
        const plugins = (window as Window & {
            Capacitor?: { Plugins?: { Haptics?: { notification: (opts: { type: string }) => Promise<void> } } };
        }).Capacitor?.Plugins;
        await plugins?.Haptics?.notification({ type: 'SUCCESS' });
    } catch {
        // Haptics unavailable — ignore
    }
}
