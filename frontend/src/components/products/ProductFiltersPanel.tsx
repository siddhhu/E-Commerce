'use client';

import { SlidersHorizontal } from 'lucide-react';
import { CategoryRead } from '@/lib/api';

interface ProductFiltersPanelProps {
    categories: CategoryRead[];
    brands: Array<{ id: string; name: string }>;
    selectedCategory: string;
    selectedBrand: string;
    selectedDiscount: string;
    priceBand: string;
    inStockOnly: boolean;
    activeFilterCount: number;
    onCategoryChange: (value: string) => void;
    onBrandChange: (value: string) => void;
    onDiscountChange: (value: string) => void;
    onPriceBandChange: (value: string) => void;
    onInStockChange: (checked: boolean) => void;
    onClear: () => void;
}

export function ProductFiltersPanel({
    categories,
    brands,
    selectedCategory,
    selectedBrand,
    selectedDiscount,
    priceBand,
    inStockOnly,
    activeFilterCount,
    onCategoryChange,
    onBrandChange,
    onDiscountChange,
    onPriceBandChange,
    onInStockChange,
    onClear,
}: ProductFiltersPanelProps) {
    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                    <SlidersHorizontal className="h-4 w-4 text-primary" /> Filters
                </div>
                {activeFilterCount > 0 && (
                    <button type="button" onClick={onClear} className="text-xs font-bold text-primary hover:underline">
                        Clear
                    </button>
                )}
            </div>

            <div className="space-y-4">
                <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Category</label>
                    <select
                        value={selectedCategory}
                        onChange={(e) => onCategoryChange(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 min-h-[44px]"
                    >
                        <option value="">All categories</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Brand</label>
                    <select
                        value={selectedBrand}
                        onChange={(e) => onBrandChange(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 min-h-[44px]"
                    >
                        <option value="">All brands</option>
                        {brands.map((brand) => (
                            <option key={brand.id} value={brand.id}>{brand.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Discount</label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                        {['10', '25', '40', '60'].map((value) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => onDiscountChange(selectedDiscount === value ? '' : value)}
                                className={`rounded-full border px-3 py-2.5 text-xs font-bold transition-colors min-h-[44px] ${selectedDiscount === value ? 'border-primary bg-primary text-white' : 'border-slate-200 hover:border-primary/50'}`}
                            >
                                {value}%+ off
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Price</label>
                    <select
                        value={priceBand}
                        onChange={(e) => onPriceBandChange(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 min-h-[44px]"
                    >
                        <option value="">All prices</option>
                        <option value="0-199">Under ₹199</option>
                        <option value="200-499">₹200 - ₹499</option>
                        <option value="500-999">₹500 - ₹999</option>
                        <option value="1000-999999">₹1000+</option>
                    </select>
                </div>

                <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold min-h-[44px]">
                    In stock only
                    <input
                        type="checkbox"
                        checked={inStockOnly}
                        onChange={(e) => onInStockChange(e.target.checked)}
                        className="h-5 w-5 accent-primary"
                    />
                </label>
            </div>
        </>
    );
}
