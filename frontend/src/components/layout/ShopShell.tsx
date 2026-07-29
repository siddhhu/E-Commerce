'use client';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { NativeAppBar } from '@/components/layout/NativeAppBar';
import { OpenInAppBanner } from '@/components/layout/OpenInAppBanner';
import { cn } from '@/lib/utils';
import { useIsNativeApp } from '@/hooks/use-is-native-app';

interface ShopShellProps {
    children: React.ReactNode;
    /** Hide bottom nav on full-screen flows (checkout, login) */
    hideBottomNav?: boolean;
    /** Extra bottom padding for pages with their own sticky mobile bar (PDP) */
    extraBottomPadding?: boolean;
    className?: string;
    mainClassName?: string;
}

export function ShopShell({
    children,
    hideBottomNav = false,
    extraBottomPadding = false,
    className,
    mainClassName,
}: ShopShellProps) {
    const isNative = useIsNativeApp();

    return (
        <div className={cn('min-h-screen flex flex-col', isNative && 'native-shell', className)}>
            <OpenInAppBanner />
            {isNative && <NativeAppBar />}
            <div className={cn(isNative && 'web-site-header hidden')}>
                <Header />
            </div>
            <main
                className={cn(
                    'flex-1 native-page-enter',
                    !hideBottomNav && 'pb-bottom-nav',
                    extraBottomPadding && 'pb-24 md:pb-8',
                    isNative && 'native-main',
                    mainClassName
                )}
            >
                {children}
            </main>
            <div className={cn(isNative && 'web-site-footer hidden')}>
                <Footer />
            </div>
            {!hideBottomNav && <MobileBottomNav native={isNative} />}
        </div>
    );
}
