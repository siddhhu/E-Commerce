'use client';

import { useEffect, useState } from 'react';
import { isMobileWebView } from '@/lib/is-mobile-webview';

/** Hydration-safe — true inside Play Store WebView wrappers and mobile browsers. */
export function useIsMobileWebView(): boolean {
    const [mobile, setMobile] = useState(false);

    useEffect(() => {
        setMobile(isMobileWebView());
    }, []);

    return mobile;
}
