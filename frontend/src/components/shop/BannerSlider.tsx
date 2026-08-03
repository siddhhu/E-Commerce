'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { bannerApi, Banner } from '@/lib/api';
import { resolveImageUrl, cn } from '@/lib/utils';

/** Upload banners at this size for edge-to-edge display without cropping */
export const BANNER_RECOMMENDED_WIDTH = 1920;
export const BANNER_RECOMMENDED_HEIGHT = 640;

export function BannerSlider({ initialBanners = null }: { initialBanners?: Banner[] | null }) {
    const [banners, setBanners] = useState<Banner[]>(initialBanners || []);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(!initialBanners);
    const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

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
            <div className="w-full aspect-[3/1] min-h-[140px] bg-slate-100 flex items-center justify-center rounded-xl md:rounded-2xl animate-pulse">
                <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
            </div>
        );
    }

    if (banners.length === 0) {
        return null;
    }

    const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % banners.length);
    const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);

    return (
        <div className="relative group w-full overflow-hidden rounded-xl md:rounded-2xl">
            {banners.map((banner, index) => {
                const isActive = index === currentIndex;
                const imageSrc = resolveImageUrl(
                    failedImages[banner.id] ? '/placeholder.jpg' : banner.image_url
                );

                return (
                    <div
                        key={banner.id}
                        className={cn(
                            'w-full transition-opacity duration-700 ease-in-out',
                            isActive
                                ? 'relative z-10 opacity-100'
                                : 'absolute inset-0 z-0 opacity-0 pointer-events-none'
                        )}
                    >
                        {/* Full width, natural height — no side gaps when image is 1920×640 (3:1) */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={imageSrc}
                            alt={banner.title || 'Promotional banner'}
                            className="block w-full h-auto"
                            loading={index === 0 ? 'eager' : 'lazy'}
                            decoding="async"
                            onError={() => setFailedImages((prev) => ({ ...prev, [banner.id]: true }))}
                        />
                        {banner.link_url && isActive && (
                            <Link
                                href={banner.link_url}
                                className="absolute inset-0 z-10"
                                aria-label={banner.title ? `Shop ${banner.title}` : 'View promotion'}
                            />
                        )}
                    </div>
                );
            })}

            {banners.length > 1 && (
                <>
                    <button
                        type="button"
                        onClick={prevSlide}
                        className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 z-20 h-9 w-9 md:h-10 md:w-10 rounded-full bg-black/25 backdrop-blur-md text-white flex items-center justify-center md:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/40"
                        aria-label="Previous banner"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                        type="button"
                        onClick={nextSlide}
                        className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 z-20 h-9 w-9 md:h-10 md:w-10 rounded-full bg-black/25 backdrop-blur-md text-white flex items-center justify-center md:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/40"
                        aria-label="Next banner"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>

                    <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                        {banners.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setCurrentIndex(i)}
                                aria-label={`Go to banner ${i + 1}`}
                                className={cn(
                                    'h-1.5 rounded-full transition-all',
                                    i === currentIndex ? 'w-8 bg-primary' : 'w-2 bg-white/80 shadow-sm'
                                )}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
