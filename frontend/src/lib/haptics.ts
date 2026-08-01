/**
 * Light haptic feedback on native (Capacitor). No-op on regular web browsers.
 */
import { getCapacitorPlugins } from '@/lib/native/capacitor-bridge';

export async function hapticLight(): Promise<void> {
    try {
        await getCapacitorPlugins()?.Haptics?.impact({ style: 'LIGHT' });
    } catch {
        /* no-op on web */
    }
}

export async function hapticSuccess(): Promise<void> {
    try {
        await getCapacitorPlugins()?.Haptics?.notification({ type: 'SUCCESS' });
    } catch {
        /* no-op on web */
    }
}

export async function hapticError(): Promise<void> {
    try {
        await getCapacitorPlugins()?.Haptics?.notification({ type: 'ERROR' });
    } catch {
        /* no-op on web */
    }
}
