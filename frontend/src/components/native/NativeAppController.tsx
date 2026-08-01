'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useIsNativeApp } from '@/hooks/use-is-native-app';
import { getCapacitorPlugins } from '@/lib/native/capacitor-bridge';
import { invalidateApiCache } from '@/lib/api-cache';

const ROOT_TABS = new Set(['/', '/products', '/cart', '/orders', '/profile']);

function isRootTab(pathname: string): boolean {
    return ROOT_TABS.has(pathname);
}

/**
 * Wires native lifecycle: Android back, keyboard inset, resume refresh, double-back exit.
 */
export function NativeAppController() {
    const isNative = useIsNativeApp();
    const pathname = usePathname();
    const router = useRouter();
    const lastBackAt = useRef(0);

    useEffect(() => {
        if (!isNative) return;

        const plugins = getCapacitorPlugins();
        const app = plugins?.App;
        const keyboard = plugins?.Keyboard;

        void keyboard?.setScroll({ isDisabled: false });

        const keyboardShow = () => document.body.classList.add('keyboard-open');
        const keyboardHide = () => document.body.classList.remove('keyboard-open');

        const keyboardShowSub = keyboard?.addListener('keyboardWillShow', keyboardShow);
        const keyboardHideSub = keyboard?.addListener('keyboardWillHide', keyboardHide);

        const backSub = app?.addListener('backButton', ({ canGoBack }) => {
            if (canGoBack) {
                router.back();
                return;
            }

            if (isRootTab(pathname)) {
                const now = Date.now();
                if (now - lastBackAt.current < 2000) {
                    void app?.exitApp();
                } else {
                    lastBackAt.current = now;
                }
                return;
            }

            router.push('/');
        });

        const resumeSub = app?.addListener('appStateChange', ({ isActive }) => {
            if (!isActive) return;
            invalidateApiCache();
            router.refresh();
        });

        return () => {
            keyboardShowSub?.remove();
            keyboardHideSub?.remove();
            backSub?.remove();
            resumeSub?.remove();
            document.body.classList.remove('keyboard-open');
        };
    }, [isNative, pathname, router]);

    return null;
}
