'use client';

import { BadgePercent, Sparkles, Truck } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { SHOPPING_OFFERS, getBulkDiscountShortfall, getBulkDiscount } from '@/lib/pricing';

interface ShoppingOffersBarProps {
    subtotal?: number;
    promoDiscount?: number;
    compact?: boolean;
}

export function ShoppingOffersBar({ subtotal = 0, promoDiscount = 0, compact = false }: ShoppingOffersBarProps) {
    const bulkActive = getBulkDiscount(subtotal, promoDiscount) > 0;
    const bulkShortfall = getBulkDiscountShortfall(subtotal, promoDiscount);

    return (
        <div
            className={
                compact
                    ? 'rounded-xl border border-pink-100 bg-gradient-to-r from-[#fff7fb] to-white p-3 text-sm'
                    : 'rounded-2xl border border-pink-100 bg-gradient-to-r from-[#fff1f7] via-white to-[#fff7fb] p-4'
            }
        >
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
                <span className="inline-flex items-center gap-2 font-semibold text-slate-800">
                    <Truck className="h-4 w-4 shrink-0 text-[#e91e63]" />
                    Free delivery on orders {formatPrice(SHOPPING_OFFERS.freeDeliveryFrom)}+
                </span>
                <span className="inline-flex items-center gap-2 font-semibold text-slate-800">
                    <BadgePercent className="h-4 w-4 shrink-0 text-[#e91e63]" />
                    Extra {SHOPPING_OFFERS.bulkDiscountPercent}% off on shopping {formatPrice(SHOPPING_OFFERS.bulkDiscountFrom)}+
                </span>
            </div>
            {subtotal > 0 && bulkShortfall > 0 && !bulkActive && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#e91e63]">
                    <Sparkles className="h-3.5 w-3.5" />
                    Add {formatPrice(bulkShortfall)} more to unlock an extra {SHOPPING_OFFERS.bulkDiscountPercent}% off
                </p>
            )}
            {bulkActive && (
                <p className="mt-2 text-xs font-semibold text-green-700">
                    Extra {SHOPPING_OFFERS.bulkDiscountPercent}% bulk discount applied — you save {formatPrice(getBulkDiscount(subtotal, promoDiscount))}!
                </p>
            )}
        </div>
    );
}
