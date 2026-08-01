'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useIsNativeApp } from '@/hooks/use-is-native-app';
import { getCapacitorPlugins } from '@/lib/native/capacitor-bridge';
import { cn } from '@/lib/utils';

/**
 * Shows an offline banner inside the native app when network drops.
 */
export function NetworkStatusBanner() {
    const isNative = useIsNativeApp();
    const [online, setOnline] = useState(true);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!isNative) return;

        const network = getCapacitorPlugins()?.Network;
        let listener: { remove: () => void } | undefined;

        const sync = (connected: boolean) => {
            setOnline(connected);
            setVisible(!connected);
        };

        if (network) {
            void network.getStatus().then((s) => sync(s.connected));
            listener = network.addListener('networkStatusChange', (s) => sync(s.connected));
        } else {
            sync(typeof navigator !== 'undefined' ? navigator.onLine : true);
            const onOnline = () => sync(true);
            const onOffline = () => sync(false);
            window.addEventListener('online', onOnline);
            window.addEventListener('offline', onOffline);
            return () => {
                window.removeEventListener('online', onOnline);
                window.removeEventListener('offline', onOffline);
            };
        }

        return () => listener?.remove();
    }, [isNative]);

    if (!isNative || online) return null;

    return (
        <div
            className={cn(
                'fixed left-0 right-0 z-[60] flex items-center justify-center gap-2 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform duration-300 md:hidden',
                visible ? 'translate-y-0' : '-translate-y-full',
                'top-[calc(env(safe-area-inset-top,0px)+3.5rem)]'
            )}
            role="status"
        >
            <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
            <span>You&apos;re offline — reconnect to browse and checkout</span>
        </div>
    );
}
