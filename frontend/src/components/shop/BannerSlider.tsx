'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { bannerApi, Banner } from '@/lib/api';

export function BannerSlider({ initialBanners = null }: { initialBanners?: Banner[] | null }) {
    const [banners, setBanners] = useState<Banner[]>(initialBanners || []);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(!initialBanners);

    useEffect(() => {
        if (initialBanners !== null) return;
        
        const fetchBanners = async () => {
            try {
                const data = await bannerApi.list();
                setBanners(data);
            } catch (error) {
                console.error('Failed to fetch banners:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBanners();
    }, [initialBanners]);

    useEffect(() => {
        if (banners.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % banners.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [banners]);

    if (isLoading) {
        return (
            <div className="aspect-[16/10] md:aspect-[16/7] lg:h-[500px] w-full bg-slate-100 flex items-center justify-center rounded-xl md:rounded-2xl animate-pulse">
                <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
            </div>
        );
    }

    if (banners.length === 0) {
        return null; // Don't show anything if no active banners
    }

    const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % banners.length);
    const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);

    return (
        <div className="relative group overflow-hidden rounded-xl md:rounded-2xl aspect-[16/10] md:aspect-[16/7] lg:h-[500px] bg-slate-100">
            {banners.map((banner, index) => {
                const isActive = index === currentIndex;
                return (
                    <div
                        key={banner.id}
                        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                            isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
                        }`}
                    >
                        <img
                            src={banner.image_url}
                            alt={banner.title}
                            className="w-full h-full object-contain md:object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 md:inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/65 via-black/20 to-transparent flex items-end md:items-center pointer-events-none">
                            <div className="w-full px-5 pb-6 md:container md:px-16 md:pb-0">
                                <div className="max-w-xl space-y-3 md:space-y-6 text-white transform transition-all duration-700 translate-y-0 opacity-100 pointer-events-auto">
                                    <h2 className="text-xl sm:text-2xl md:text-5xl lg:text-6xl font-bold leading-tight drop-shadow-sm">
                                        {banner.title}
                                    </h2>
                                    {banner.link_url && (
                                        <Link href={banner.link_url} className="inline-block relative z-20">
                                            <Button size="lg" className="bg-primary hover:bg-primary/90 text-white border-none gap-2 mt-1 md:mt-4 font-bold h-10 md:h-14 px-5 md:px-8 rounded-full shadow-lg hover:shadow-primary/30 transition-all cursor-pointer">
                                                Shop Now <ArrowRight className="h-5 w-5" />
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* Overlay Link for the entire banner area */}
                        {banner.link_url && (
                            <Link 
                                href={banner.link_url} 
                                className="absolute inset-0 z-10"
                                aria-label={`Shop ${banner.title}`}
                            />
                        )}
                    </div>
                );
            })}

            {/* Controls */}
            {banners.length > 1 && (
                <>
                    <button
                        onClick={prevSlide}
                        className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 z-20 h-9 w-9 md:h-10 md:w-10 rounded-full bg-white/25 backdrop-blur-md text-white flex items-center justify-center md:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                        onClick={nextSlide}
                        className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 z-20 h-9 w-9 md:h-10 md:w-10 rounded-full bg-white/25 backdrop-blur-md text-white flex items-center justify-center md:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>

                    {/* Indicators */}
                    <div className="absolute bottom-3 md:bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                        {banners.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentIndex(i)}
                                className={`h-1.5 rounded-full transition-all ${
                                    i === currentIndex ? 'w-8 bg-primary' : 'w-2 bg-white/50'
                                }`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
