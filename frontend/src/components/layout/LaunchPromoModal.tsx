'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BadgePercent, Copy, Sparkles, X, Gift, Rocket } from 'lucide-react';
import { promoCodesApi, PromoCode } from '@/lib/api';
import { SELLER_DISPLAY_NAME } from '@/lib/seller-branding';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const SESSION_KEY = 'parlour-launch-promo-seen';
const SKIP_PREFIXES = ['/admin', '/checkout', '/login', '/seller', '/profile/setup'];

function describePromo(promo: PromoCode): string {
    if (promo.discount_type === 'percent') {
        const cap = Number(promo.max_discount_amount || 0);
        return `${Number(promo.discount_value)}% OFF${cap > 0 ? ` · up to ₹${cap}` : ''}`;
    }
    return `₹${Number(promo.discount_value)} OFF`;
}

export function LaunchPromoModal() {
    const pathname = usePathname();
    const { toast } = useToast();
    const [phase, setPhase] = useState<'loading' | 'ready' | 'hidden'>('loading');
    const [promo, setPromo] = useState<PromoCode | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) {
            setPhase('hidden');
            return;
        }
        if (sessionStorage.getItem(SESSION_KEY)) {
            setPhase('hidden');
            return;
        }

        let mounted = true;
        const minDelay = new Promise<void>((resolve) => window.setTimeout(resolve, 700));

        Promise.all([
            minDelay,
            promoCodesApi.active().catch(() => [] as PromoCode[]),
        ]).then(([, promos]) => {
            if (!mounted) return;
            setPromo(promos[0] ?? null);
            setPhase('ready');
        });

        return () => {
            mounted = false;
        };
    }, [pathname]);

    const dismiss = useCallback(() => {
        sessionStorage.setItem(SESSION_KEY, '1');
        setPhase('hidden');
    }, []);

    const copyCode = useCallback(async () => {
        if (!promo?.code) return;
        try {
            await navigator.clipboard.writeText(promo.code);
            toast({ title: 'Copied!', description: `Promo code ${promo.code} copied.` });
        } catch {
            toast({ title: promo.code, description: 'Use this code at checkout.' });
        }
    }, [promo, toast]);

    if (phase === 'hidden') return null;

    return (
        <div
            className={cn(
                'fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4',
                phase === 'loading' ? 'launch-overlay-enter' : 'launch-overlay-enter launch-overlay-ready'
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Launch offer"
        >
            <button
                type="button"
                className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
                aria-label="Close"
                onClick={dismiss}
            />

            <div className="relative w-full max-w-md overflow-hidden rounded-t-[28px] sm:rounded-[28px] bg-white shadow-2xl launch-card-enter">
                <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-br from-[#fce4ec] via-[#f8bbd0] to-[#f48fb1] opacity-90" />
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/30 blur-2xl" />
                <div className="absolute -left-6 top-16 h-24 w-24 rounded-full bg-[#e91e63]/20 blur-xl" />

                <button
                    type="button"
                    onClick={dismiss}
                    className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/80 text-slate-600 shadow-sm backdrop-blur active:scale-95"
                    aria-label="Close offer"
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="relative px-6 pb-6 pt-8">
                    {phase === 'loading' ? (
                        <div className="py-10 text-center">
                            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white/90 shadow-lg">
                                <Sparkles className="h-7 w-7 text-[#e91e63] animate-pulse" />
                            </div>
                            <p className="text-sm font-semibold text-slate-700">Loading your exclusive offers…</p>
                            <div className="mx-auto mt-4 h-1.5 w-28 overflow-hidden rounded-full bg-white/70">
                                <div className="h-full w-1/2 animate-[shimmer_1s_ease-in-out_infinite] rounded-full bg-[#e91e63]" />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="mb-5 flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#c2185b] shadow-sm">
                                    <Rocket className="h-3.5 w-3.5" /> App Launch
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e91e63] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-sm">
                                    <Gift className="h-3.5 w-3.5" /> New
                                </span>
                            </div>

                            <h2 className="text-2xl font-black tracking-tight text-slate-900">
                                Welcome to {SELLER_DISPLAY_NAME}
                            </h2>
                            <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                Premium salon &amp; beauty wholesale — curated deals, fast checkout, and GST-ready invoices.
                            </p>

                            <div className="mt-5 rounded-2xl border border-pink-100 bg-gradient-to-r from-white to-pink-50/80 p-4 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e91e63] text-white shadow-md shadow-pink-200">
                                        <BadgePercent className="h-5 w-5" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold uppercase tracking-wide text-pink-500">
                                            {promo ? 'Live promo' : 'Launch offer'}
                                        </p>
                                        <p className="mt-0.5 text-lg font-extrabold text-slate-900">
                                            {promo ? describePromo(promo) : 'Up to 40% off salon favourites'}
                                        </p>
                                        {promo ? (
                                            <button
                                                type="button"
                                                onClick={copyCode}
                                                className="mt-2 inline-flex items-center gap-2 rounded-full border border-dashed border-pink-300 bg-white px-3 py-1.5 text-sm font-black text-[#c2185b] active:scale-[0.98]"
                                            >
                                                {promo.code}
                                                <Copy className="h-3.5 w-3.5" />
                                            </button>
                                        ) : (
                                            <p className="mt-1 text-xs text-slate-500">Browse live discounts on the home page.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={dismiss}
                                    className="min-h-[48px] rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 active:scale-[0.98]"
                                >
                                    Maybe later
                                </button>
                                <Link
                                    href={promo ? `/products?promo=${encodeURIComponent(promo.code)}` : '/products?min_discount=1'}
                                    onClick={dismiss}
                                    className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#e91e63] to-[#d81b60] text-sm font-bold text-white shadow-lg shadow-pink-200 active:scale-[0.98]"
                                >
                                    Shop deals
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
