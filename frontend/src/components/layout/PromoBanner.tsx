'use client';

import { useEffect, useMemo, useState } from 'react';
import { BadgePercent, Sparkles, Tag } from 'lucide-react';

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
        return describePromo(activePromo);
    }, [activePromo]);

    return (
        <div className="relative isolate w-full overflow-hidden border-y border-pink-100 bg-gradient-to-r from-[#fff1f7] via-white to-[#fff7fb] text-slate-900">
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(219,39,119,0.08)_0_1px,transparent_1px_40px),radial-gradient(circle_at_18%_45%,rgba(236,72,153,0.18),transparent_24%),radial-gradient(circle_at_84%_55%,rgba(244,114,182,0.16),transparent_22%)]" />
            <div className="mx-auto flex min-h-[48px] max-w-7xl items-center justify-center gap-3 px-4 py-2 text-center sm:justify-between">
                <div className="hidden items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary sm:flex">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-white shadow-sm ring-1 ring-pink-100">
                        <BadgePercent className="h-4 w-4" />
                    </span>
                    Beauty Deals
                </div>

                <div className="flex min-w-0 items-center justify-center gap-2 text-sm font-semibold sm:text-base">
                    <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-sm ring-1 ring-pink-100 sm:inline-flex">
                    <Sparkles className="h-4 w-4" />
                    </span>
                    <span className="align-middle">{bannerText}</span>
                    {activePromo && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-pink-200 bg-white px-3 py-1 text-xs font-black uppercase tracking-wide text-primary shadow-sm">
                            <Tag className="h-3 w-3" />
                            {activePromo.code}
                        </span>
                    )}
                </div>

                <div className="hidden items-center gap-1 sm:flex">
                    {(promos.length > 0 ? promos : [null]).slice(0, 4).map((_, index) => (
                        <span
                            key={index}
                            className={`h-1.5 rounded-full transition-all ${
                                index === activeIndex ? 'w-6 bg-primary' : 'w-1.5 bg-pink-200'
                            }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
