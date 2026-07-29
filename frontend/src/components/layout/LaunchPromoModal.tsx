'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    BadgePercent,
    Copy,
    Sparkles,
    X,
    Rocket,
    Truck,
    ChevronRight,
    ChevronLeft,
    ShoppingBag,
} from 'lucide-react';
import { homeApi, PromoCode } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const SESSION_KEY = 'pranjay-launch-promo-seen';
const SKIP_PREFIXES = ['/admin', '/checkout', '/login', '/seller', '/profile/setup'];
const BRAND = 'Pranjay';
const SLIDE_COUNT = 3;

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
    const [slide, setSlide] = useState(0);
    const [promo, setPromo] = useState<PromoCode | null>(null);
    const [direction, setDirection] = useState<'next' | 'prev'>('next');

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
        const minDelay = new Promise<void>((resolve) => window.setTimeout(resolve, 600));

        Promise.all([
            minDelay,
            homeApi.bootstrap({ featured_limit: 1, discounted_limit: 1 }).catch(() => null),
        ]).then(([, bootstrap]) => {
            if (!mounted) return;
            setPromo(bootstrap?.promos?.[0] ?? null);
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

    const goNext = useCallback(() => {
        if (slide >= SLIDE_COUNT - 1) {
            dismiss();
            return;
        }
        setDirection('next');
        setSlide((s) => s + 1);
    }, [slide, dismiss]);

    const goPrev = useCallback(() => {
        setDirection('prev');
        setSlide((s) => Math.max(0, s - 1));
    }, []);

    const shopHref = useMemo(
        () => (promo ? `/products?min_discount=1` : '/products?min_discount=1'),
        [promo]
    );

    if (phase === 'hidden') return null;

    return (
        <div
            className={cn(
                'fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4',
                'launch-overlay-enter launch-overlay-ready'
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Pranjay offers"
        >
            <button
                type="button"
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-[3px]"
                aria-label="Close"
                onClick={dismiss}
            />

            <div className="relative w-full max-w-md overflow-hidden rounded-t-[28px] sm:rounded-[28px] bg-white shadow-2xl launch-card-enter">
                <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-br from-[#fce4ec] via-[#f8bbd0] to-[#f48fb1]" />
                <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/25 blur-2xl" />

                <button
                    type="button"
                    onClick={dismiss}
                    className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/85 text-slate-600 shadow-sm backdrop-blur active:scale-95"
                    aria-label="Close"
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="relative px-6 pb-6 pt-8 min-h-[380px] flex flex-col">
                    {phase === 'loading' ? (
                        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
                            <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-white/90 shadow-lg">
                                <span className="text-2xl font-black bg-gradient-to-r from-[#e91e63] to-[#d81b60] bg-clip-text text-transparent">
                                    P
                                </span>
                            </div>
                            <p className="text-sm font-semibold text-slate-700">Loading {BRAND} offers…</p>
                            <div className="mx-auto mt-4 h-1.5 w-32 overflow-hidden rounded-full bg-white/70">
                                <div className="h-full w-1/2 animate-[shimmer_1s_ease-in-out_infinite] rounded-full bg-[#e91e63]" />
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Progress dots */}
                            <div className="mb-4 flex items-center justify-center gap-2">
                                {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        aria-label={`Slide ${i + 1}`}
                                        onClick={() => {
                                            setDirection(i > slide ? 'next' : 'prev');
                                            setSlide(i);
                                        }}
                                        className={cn(
                                            'h-1.5 rounded-full transition-all duration-300',
                                            i === slide ? 'w-8 bg-[#e91e63]' : 'w-1.5 bg-pink-200'
                                        )}
                                    />
                                ))}
                            </div>

                            <div
                                key={slide}
                                className={cn(
                                    'flex-1 launch-slide-enter',
                                    direction === 'next' ? 'launch-slide-next' : 'launch-slide-prev'
                                )}
                            >
                                {slide === 0 && (
                                    <>
                                        <div className="mb-4 flex items-center gap-2">
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#c2185b] shadow-sm">
                                                <Rocket className="h-3.5 w-3.5" /> Launch
                                            </span>
                                        </div>
                                        <div className="mb-4 flex items-center gap-3">
                                            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#e91e63] to-[#d81b60] text-xl font-black text-white shadow-lg shadow-pink-200">
                                                P
                                            </span>
                                            <div>
                                                <h2 className="text-2xl font-black tracking-tight text-slate-900">
                                                    Welcome to {BRAND}
                                                </h2>
                                                <p className="text-xs font-semibold text-pink-500">Wholesale beauty, reimagined</p>
                                            </div>
                                        </div>
                                        <p className="text-sm leading-relaxed text-slate-600">
                                            Salon essentials, cosmetics &amp; wholesale deals — curated for professionals and beauty lovers across India.
                                        </p>
                                        <ul className="mt-4 space-y-2 text-sm text-slate-700">
                                            <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#e91e63]" /> Live discounts on top brands</li>
                                            <li className="flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-[#e91e63]" /> One-tap add to cart</li>
                                        </ul>
                                    </>
                                )}

                                {slide === 1 && (
                                    <>
                                        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[#e91e63] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-sm">
                                            <BadgePercent className="h-3.5 w-3.5" /> Exclusive offer
                                        </div>
                                        <h2 className="text-2xl font-black tracking-tight text-slate-900">
                                            {promo ? describePromo(promo) : 'Up to 40% off favourites'}
                                        </h2>
                                        <p className="mt-2 text-sm text-slate-600">
                                            {promo
                                                ? 'Apply this code at checkout for instant savings on your order.'
                                                : 'Browse live discounts — updated daily on salon & beauty picks.'}
                                        </p>
                                        <div className="mt-5 rounded-2xl border border-pink-100 bg-gradient-to-r from-white to-pink-50 p-4 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#e91e63] text-white shadow-md">
                                                    <BadgePercent className="h-6 w-6" />
                                                </span>
                                                <div>
                                                    <p className="text-xs font-bold uppercase text-pink-500">Today&apos;s deal</p>
                                                    <p className="text-lg font-extrabold text-slate-900">
                                                        {promo ? describePromo(promo) : 'Flash sale live now'}
                                                    </p>
                                                    {promo && (
                                                        <button
                                                            type="button"
                                                            onClick={copyCode}
                                                            className="mt-2 inline-flex items-center gap-2 rounded-full border border-dashed border-pink-300 bg-white px-3 py-1 text-sm font-black text-[#c2185b] active:scale-[0.98]"
                                                        >
                                                            {promo.code}
                                                            <Copy className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {slide === 2 && (
                                    <>
                                        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-sm">
                                            <Truck className="h-3.5 w-3.5" /> Ready to shop
                                        </div>
                                        <h2 className="text-2xl font-black tracking-tight text-slate-900">
                                            Fast checkout. Easy orders.
                                        </h2>
                                        <p className="mt-2 text-sm text-slate-600">
                                            COD in select states, secure online pay, and GST-ready invoices — everything you need to stock up quickly.
                                        </p>
                                        <div className="mt-5 grid grid-cols-2 gap-3">
                                            <div className="rounded-xl bg-pink-50 p-3 text-center">
                                                <Truck className="mx-auto h-6 w-6 text-[#e91e63]" />
                                                <p className="mt-1 text-xs font-bold text-slate-800">Quick delivery</p>
                                            </div>
                                            <div className="rounded-xl bg-pink-50 p-3 text-center">
                                                <ShoppingBag className="mx-auto h-6 w-6 text-[#e91e63]" />
                                                <p className="mt-1 text-xs font-bold text-slate-800">Wholesale prices</p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="mt-5 flex items-center gap-3">
                                {slide > 0 ? (
                                    <button
                                        type="button"
                                        onClick={goPrev}
                                        className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white active:scale-95"
                                        aria-label="Previous"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={dismiss}
                                        className="min-h-[48px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 active:scale-[0.98]"
                                    >
                                        Skip
                                    </button>
                                )}

                                {slide < SLIDE_COUNT - 1 ? (
                                    <button
                                        type="button"
                                        onClick={goNext}
                                        className="flex flex-1 min-h-[48px] items-center justify-center gap-1 rounded-2xl bg-gradient-to-r from-[#e91e63] to-[#d81b60] text-sm font-bold text-white shadow-lg shadow-pink-200 active:scale-[0.98]"
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                ) : (
                                    <Link
                                        href={shopHref}
                                        onClick={dismiss}
                                        className="flex flex-1 min-h-[48px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#e91e63] to-[#d81b60] text-sm font-bold text-white shadow-lg shadow-pink-200 active:scale-[0.98]"
                                    >
                                        Start shopping
                                    </Link>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
