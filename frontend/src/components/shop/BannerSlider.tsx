'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { bannerApi, Banner } from '@/lib/api';

export function BannerSlider() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
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
    }, []);

    useEffect(() => {
        if (banners.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % banners.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [banners]);

    if (isLoading) {
        return (
            <div className="h-[400px] w-full bg-slate-100 flex items-center justify-center rounded-2xl animate-pulse">
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
        <div className="relative group overflow-hidden rounded-2xl h-[400px] md:h-[500px]">
            {banners.map((banner, index) => (
                <div
                    key={banner.id}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                        index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                    }`}
                >
                    <img
                        src={banner.image_url}
                        alt={banner.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent flex items-center">
                        <div className="container px-8 md:px-16">
                            <div className="max-w-xl space-y-6 text-white transform transition-all duration-700 translate-y-0 opacity-100">
                                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                                    {banner.title}
                                </h2>
                                {banner.link_url && (
                                    <Link href={banner.link_url}>
                                        <Button size="lg" className="bg-primary hover:bg-primary/90 text-white border-none gap-2 mt-4 font-bold h-14 px-8 rounded-full shadow-lg hover:shadow-primary/30 transition-all">
                                            Shop Now <ArrowRight className="h-5 w-5" />
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {/* Controls */}
            {banners.length > 1 && (
                <>
                    <button
                        onClick={prevSlide}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                        onClick={nextSlide}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>

                    {/* Indicators */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
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
