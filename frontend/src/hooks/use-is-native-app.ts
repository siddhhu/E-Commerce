'use client';

import { useEffect, useState } from 'react';
import { isNativeApp } from '@/lib/is-native-app';

/** Hydration-safe native detection (false on server, updates after mount). */
export function useIsNativeApp(): boolean {
    const [native, setNative] = useState(false);

    useEffect(() => {
        setNative(isNativeApp());
        if (isNativeApp()) {
            document.documentElement.classList.add('native-app');
        }
    }, []);

    return native;
}
