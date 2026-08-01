'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { LaunchPromoModal } from '@/components/layout/LaunchPromoModal';
import { NativeAppController } from '@/components/native/NativeAppController';
import { NetworkStatusBanner } from '@/components/native/NetworkStatusBanner';
import { useIsNativeApp } from '@/hooks/use-is-native-app';
import { getCapacitorPlugins } from '@/lib/native/capacitor-bridge';

const PREFETCH_ROUTES = ['/', '/products', '/cart', '/orders', '/profile'];

/**
 * Global app polish: native shell setup, launch promo, route prefetch.
 */
export function AppExperienceProvider({ children }: { children: React.ReactNode }) {
    const isNative = useIsNativeApp();
    const pathname = usePathname();

    useEffect(() => {
        if (!isNative) return;

        const plugins = getCapacitorPlugins();
        void plugins?.StatusBar?.setStyle({ style: 'LIGHT' });
        void plugins?.StatusBar?.setBackgroundColor({ color: '#ffffff' });
        void plugins?.SplashScreen?.hide({ fadeOutDuration: 300 });
    }, [isNative]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        PREFETCH_ROUTES.forEach((route) => {
            if (route === pathname) return;
            const existing = document.querySelector(`link[rel="prefetch"][href="${route}"]`);
            if (existing) return;
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = route;
            document.head.appendChild(link);
        });

        const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '');
        if (apiBase) {
            const warm = [
                `${apiBase}/api/v1/home/bootstrap?featured_limit=20&discounted_limit=20`,
                `${apiBase}/api/v1/products/catalog-bootstrap?page=1&page_size=20`,
            ];
            warm.forEach((url) => {
                fetch(url, { credentials: 'omit' }).catch(() => undefined);
            });
        }
    }, [pathname]);

    return (
        <>
            <NativeAppController />
            <NetworkStatusBanner />
            {children}
            <LaunchPromoModal />
        </>
    );
}
