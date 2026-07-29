'use client';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { OpenInAppBanner } from '@/components/layout/OpenInAppBanner';
import { cn } from '@/lib/utils';

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
    return (
        <div className={cn('min-h-screen flex flex-col', className)}>
            <OpenInAppBanner />
            <Header />
            <main
                className={cn(
                    'flex-1',
                    !hideBottomNav && 'pb-bottom-nav',
                    extraBottomPadding && 'pb-24 md:pb-8',
                    mainClassName
                )}
            >
                {children}
            </main>
            <Footer />
            {!hideBottomNav && <MobileBottomNav />}
        </div>
    );
}
