'use client';

import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { ProductCard } from './ProductCard';
import { Product } from '@/lib/api';

interface TrendingSliderProps {
    products: Product[];
    title?: string;
    subtitle?: string;
    subDescription?: string;
    icon?: React.ReactNode;
}

export function TrendingSlider({ products, title, subtitle, subDescription, icon }: TrendingSliderProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [visibleCount, setVisibleCount] = useState(20);

    const visibleProducts = products.slice(0, visibleCount);
    const hasMoreProducts = visibleCount < products.length;

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const scrollAmount = container.clientWidth * 0.8; // Scroll by 80% of container width
            if (direction === 'right' && hasMoreProducts) {
                setVisibleCount((count) => Math.min(count + 20, products.length));
            }
            requestAnimationFrame(() => {
                container.scrollBy({
                    left: direction === 'left' ? -scrollAmount : scrollAmount,
                    behavior: 'smooth'
                });
            });
        }
    };

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            const maxScroll = scrollWidth - clientWidth;
            const progress = maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0;
            setScrollProgress(progress);
        }
    };

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            // Initial calculation
            handleScroll();
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [products]);

    useEffect(() => {
        setVisibleCount(Math.min(20, products.length || 20));
        setScrollProgress(0);
    }, [products]);

    if (!products || products.length === 0) return null;

    return (
        <section className="py-10 md:py-12 bg-white">
            <div className="container relative">
                <div className="flex items-center justify-center gap-2 mb-6 md:mb-8">
                    <span className="h-10 w-10 rounded-full bg-rose-50 text-[#e91e63] flex items-center justify-center">
                        {icon || <Sparkles className="h-5 w-5" />}
                    </span>
                    <div className="text-center">
                        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                            {title || "Trending Now"}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            {subtitle || (hasMoreProducts ? `Showing ${visibleProducts.length} of ${products.length} featured products` : `${products.length} featured products`)}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 font-medium">
                            {subDescription || "Products are trending due to its quality and its discount"}
                        </p>
                    </div>
                </div>

                {/* Left/Right Navigation Buttons */}
                <button 
                    onClick={() => scroll('left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 h-10 w-10 bg-white rounded-full shadow-[0_0_15px_rgba(0,0,0,0.1)] flex items-center justify-center text-[#e91e63] hover:bg-slate-50 transition-colors border border-slate-100 hidden md:flex"
                    aria-label="Scroll left"
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>

                <button 
                    onClick={() => scroll('right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-20 h-10 w-10 bg-white rounded-full shadow-[0_0_15px_rgba(0,0,0,0.1)] flex items-center justify-center text-[#e91e63] hover:bg-slate-50 transition-colors border border-slate-100 hidden md:flex"
                    aria-label="Scroll right"
                >
                    <ChevronRight className="h-5 w-5" />
                </button>

                {/* Scrollable Container */}
                <div 
                    ref={scrollContainerRef}
                    className="grid grid-rows-2 grid-flow-col auto-cols-max overflow-x-auto gap-3 md:gap-6 pb-6 pt-2 px-1 md:px-2 snap-x snap-mandatory hide-scrollbar relative"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {visibleProducts.map((product) => (
                        <div key={product.id} className="w-[42vw] min-w-[158px] max-w-[190px] sm:w-[220px] sm:max-w-none md:w-[280px] snap-start h-full">
                            <ProductCard product={product} />
                        </div>
                    ))}
                </div>

                {/* Bottom Scrollbar/Progress Indicator */}
                <div className="max-w-xs mx-auto mt-6 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-slate-400 rounded-full transition-all duration-300 ease-out"
                        style={{ 
                            width: '20%', 
                            transform: `translateX(${scrollProgress * 4}%)` // 4 = 100 / 25 (rough approx for the bar to slide)
                        }} 
                    />
                </div>
            </div>
            
            <style jsx global>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </section>
    );
}
