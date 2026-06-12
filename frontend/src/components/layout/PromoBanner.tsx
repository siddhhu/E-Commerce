'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Tag } from 'lucide-react';

import { promoCodesApi, PromoCode } from '@/lib/api';

function describePromo(promo: PromoCode): string {
    if (promo.discount_type === 'percent') {
        const cap = Number(promo.max_discount_amount || 0);
        return `${Number(promo.discount_value)}% off${cap > 0 ? ` up to Rs. ${cap}` : ''}`;
    }

    return `Rs. ${Number(promo.discount_value)} off`;
}

export function PromoBanner() {
    const [promos, setPromos] = useState<PromoCode[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        let mounted = true;

        promoCodesApi.active()
            .then((items) => {
                if (mounted) setPromos(items);
            })
            .catch(() => {
                if (mounted) setPromos([]);
            });

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (promos.length <= 1) return;

        const timer = window.setInterval(() => {
            setActiveIndex((current) => (current + 1) % promos.length);
        }, 4200);

        return () => window.clearInterval(timer);
    }, [promos.length]);

    const activePromo = promos[activeIndex];
    const bannerText = useMemo(() => {
        if (!activePromo) return 'Fresh beauty deals are live. Shop salon favourites and wholesale picks today.';
        return `${describePromo(activePromo)} with code ${activePromo.code}`;
    }, [activePromo]);

    return (
        <div className="relative isolate w-full overflow-hidden border-y border-pink-100 bg-gradient-to-r from-rose-50 via-white to-pink-50 text-slate-900">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_50%,rgba(236,72,153,0.18),transparent_28%),radial-gradient(circle_at_80%_50%,rgba(244,114,182,0.18),transparent_24%)]" />
            <div className="mx-auto flex min-h-[44px] max-w-7xl items-center justify-center gap-3 px-4 py-2 text-center">
                <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-sm ring-1 ring-pink-100 sm:inline-flex">
                    <Sparkles className="h-4 w-4" />
                </span>
                <div className="min-w-0 text-sm font-semibold sm:text-base">
                    <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                        <Tag className="h-3 w-3" />
                        Deal Live
                    </span>
                    <span className="align-middle">{bannerText}</span>
                </div>
            </div>
        </div>
    );
}
