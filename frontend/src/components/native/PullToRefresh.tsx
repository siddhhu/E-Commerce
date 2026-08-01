'use client';

import { useCallback, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useIsNativeApp } from '@/hooks/use-is-native-app';
import { cn } from '@/lib/utils';

const THRESHOLD = 72;
const MAX_PULL = 120;

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
}

/**
 * Touch pull-to-refresh for native app list/home screens.
 */
export function PullToRefresh({ onRefresh, children, className, disabled = false }: PullToRefreshProps) {
    const isNative = useIsNativeApp();
    const [pull, setPull] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const startY = useRef(0);
    const pulling = useRef(false);

    const handleRefresh = useCallback(async () => {
        if (refreshing) return;
        setRefreshing(true);
        try {
            await onRefresh();
        } finally {
            setRefreshing(false);
            setPull(0);
        }
    }, [onRefresh, refreshing]);

    if (!isNative || disabled) {
        return <div className={className}>{children}</div>;
    }

    return (
        <div
            className={cn('relative', className)}
            onTouchStart={(e) => {
                if (refreshing || window.scrollY > 4) return;
                startY.current = e.touches[0].clientY;
                pulling.current = true;
            }}
            onTouchMove={(e) => {
                if (!pulling.current || refreshing) return;
                const delta = e.touches[0].clientY - startY.current;
                if (delta > 0 && window.scrollY <= 4) {
                    setPull(Math.min(delta * 0.45, MAX_PULL));
                }
            }}
            onTouchEnd={() => {
                if (!pulling.current) return;
                pulling.current = false;
                if (pull >= THRESHOLD) {
                    void handleRefresh();
                } else {
                    setPull(0);
                }
            }}
        >
            <div
                className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center transition-[height,opacity] duration-200"
                style={{ height: refreshing ? 48 : pull, opacity: pull > 8 || refreshing ? 1 : 0 }}
                aria-hidden
            >
                <div className="mt-2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-pink-100">
                    <Loader2
                        className={cn('h-4 w-4 text-[#e91e63]', (refreshing || pull >= THRESHOLD) && 'animate-spin')}
                    />
                </div>
            </div>
            <div
                className="transition-transform duration-200"
                style={{ transform: pull > 0 || refreshing ? `translateY(${refreshing ? 48 : pull}px)` : undefined }}
            >
                {children}
            </div>
        </div>
    );
}
