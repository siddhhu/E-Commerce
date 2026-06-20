'use client';

import { Star } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';

const REVIEWS = [
    {
        id: 1,
        name: 'Priya S.',
        rating: 5,
        text: 'Best makeup haul ever! The shipping was so fast and everything was 100% authentic.',
        verified: true,
    },
    {
        id: 2,
        name: 'Neha Gupta',
        rating: 5,
        text: 'Absolutely love the deals here. I buy all my salon supplies in bulk and the margins are unbeatable.',
        verified: true,
    },
    {
        id: 3,
        name: 'Simran K.',
        rating: 5,
        text: 'Found exactly what I was looking for. The curated skincare section is my favorite part of the site.',
        verified: true,
    },
    {
        id: 4,
        name: 'Aisha R.',
        rating: 5,
        text: 'Great customer service and amazing packaging. My eyeshadow palette arrived in perfect condition.',
        verified: true,
    },
    {
        id: 5,
        name: 'Riya M.',
        rating: 5,
        text: 'The live discounts are incredible. I snagged my favorite serum at 40% off. Will definitely shop again!',
        verified: true,
    }
];

export function Testimonials() {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        let animationId: number;
        let scrollPos = 0;

        const scroll = () => {
            if (!isHovered && container) {
                scrollPos += 0.5;
                if (scrollPos >= container.scrollWidth / 2) {
                    scrollPos = 0;
                }
                container.scrollLeft = scrollPos;
            }
            animationId = requestAnimationFrame(scroll);
        };

        animationId = requestAnimationFrame(scroll);
        return () => cancelAnimationFrame(animationId);
    }, [isHovered]);

    // Duplicate reviews to create infinite scroll effect
    const displayReviews = [...REVIEWS, ...REVIEWS, ...REVIEWS];

    return (
        <section className="py-12 md:py-16 bg-white overflow-hidden border-y border-slate-100">
            <div className="container mb-8 text-center">
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">Loved by Thousands</h2>
                <p className="text-slate-500 mt-2">See what our customers are saying about their beauty hauls.</p>
            </div>
            
            <div 
                className="relative flex overflow-x-hidden"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div 
                    ref={scrollContainerRef}
                    className="flex gap-4 md:gap-6 px-4 md:px-8 hide-scrollbar overflow-x-hidden whitespace-nowrap"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                >
                    {displayReviews.map((review, i) => (
                        <div 
                            key={`${review.id}-${i}`}
                            className="inline-flex flex-col w-[280px] md:w-[320px] whitespace-normal bg-slate-50 p-6 rounded-2xl border border-slate-100 flex-shrink-0"
                        >
                            <div className="flex text-amber-400 mb-3">
                                {[...Array(review.rating)].map((_, j) => (
                                    <Star key={j} className="h-4 w-4 fill-current" />
                                ))}
                            </div>
                            <p className="text-slate-700 italic flex-grow text-sm md:text-base leading-relaxed">
                                "{review.text}"
                            </p>
                            <div className="mt-4 flex items-center justify-between">
                                <span className="font-bold text-slate-900 text-sm">{review.name}</span>
                                {review.verified && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                        Verified Buyer
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
