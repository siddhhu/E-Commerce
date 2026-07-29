'use client';

import { useEffect, useState } from 'react';
import { X, Smartphone } from 'lucide-react';
import { isNativeApp } from '@/lib/is-native-app';

const DISMISS_KEY = 'pranjay-app-banner-dismissed';

/**
 * Subtle banner on mobile web encouraging install — hidden inside Capacitor app.
 */
export function OpenInAppBanner() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isNativeApp()) return;
        if (typeof window === 'undefined') return;
        if (window.innerWidth >= 768) return;
        if (sessionStorage.getItem(DISMISS_KEY)) return;
        setVisible(true);
    }, []);

    if (!visible) return null;

    return (
        <div className="md:hidden bg-gradient-to-r from-[#e91e63] to-pink-500 text-white px-4 py-2.5 flex items-center gap-3 text-sm">
            <Smartphone className="h-4 w-4 shrink-0" />
            <p className="flex-1 font-medium">
                Get the Pranjay app for a faster shopping experience.
            </p>
            <button
                type="button"
                onClick={() => {
                    sessionStorage.setItem(DISMISS_KEY, '1');
                    setVisible(false);
                }}
                className="h-11 w-11 flex items-center justify-center rounded-full hover:bg-white/10"
                aria-label="Dismiss"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
