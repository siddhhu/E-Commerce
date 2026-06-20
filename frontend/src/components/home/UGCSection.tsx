'use client';

import { Instagram } from 'lucide-react';
import Link from 'next/link';

const UGC_IMAGES = [
    { id: 1, src: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=500&auto=format&fit=crop&q=60', alt: 'Makeup flatlay' },
    { id: 2, src: 'https://images.unsplash.com/photo-1631214540553-ff044a3ff1d4?w=500&auto=format&fit=crop&q=60', alt: 'Lipstick application' },
    { id: 3, src: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=500&auto=format&fit=crop&q=60', alt: 'Skincare routine' },
    { id: 4, src: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=500&auto=format&fit=crop&q=60', alt: 'Cosmetics collection' },
    { id: 5, src: 'https://images.unsplash.com/photo-1599305090598-fe179d501227?w=500&auto=format&fit=crop&q=60', alt: 'Beauty shot' },
];

export function UGCSection() {
    return (
        <section className="py-12 md:py-16 bg-slate-50">
            <div className="container">
                <div className="flex flex-col items-center text-center mb-10">
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-tr from-yellow-400 via-rose-500 to-purple-600 text-white mb-4">
                        <Instagram className="h-6 w-6" />
                    </div>
                    <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Shop the Look</h2>
                    <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
                        Tag us <span className="font-bold text-slate-900">@pranjaybeauty</span> on Instagram to be featured on our homepage. See how our community styles their favorite picks!
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                    {UGC_IMAGES.map((img, index) => (
                        <div 
                            key={img.id} 
                            className={`relative aspect-square overflow-hidden rounded-xl group ${index === 0 ? 'col-span-2 row-span-2 md:col-span-1 md:row-span-1' : ''}`}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                                src={img.src} 
                                alt={img.alt} 
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Link href="/products" className="bg-white/20 backdrop-blur-md text-white font-bold px-4 py-2 rounded-full text-sm hover:bg-white hover:text-rose-600 transition-colors">
                                    Shop Now
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
