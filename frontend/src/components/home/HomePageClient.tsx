'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles, Truck, Shield, Clock, Heart, ShoppingCart, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { apiService, APIProduct as APIProductSummary } from '@/lib/api-service';
import { productsApi } from '@/lib/api';
import { dummyProducts, getFeaturedProducts as getDummyFeatured, categories, Product as StoreProduct } from '@/lib/dummy-data';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import { formatPrice, getDiscountPercentage } from '@/lib/utils';
import { BannerSlider } from '@/components/shop/BannerSlider';
import { ProductCard } from '@/components/products/ProductCard';
import { Product as APIProduct } from '@/lib/api';
import { PromoBanner } from '@/components/layout/PromoBanner';
import { TrendingSlider } from '@/components/shop/TrendingSlider';
import { CheckCircle2, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function HomePageClient({ 
    initialFeaturedProducts = null,
    initialBanners = null
}: { 
    initialFeaturedProducts?: APIProductSummary[] | null,
    initialBanners?: any[] | null
}) {
    const router = useRouter();
    const { isAuthenticated, user } = useAuthStore();
    const [featuredProducts, setFeaturedProducts] = useState<APIProductSummary[]>(initialFeaturedProducts || []);
    const [loading, setLoading] = useState(!initialFeaturedProducts);
    const [featuredBrands, setFeaturedBrands] = useState<any[]>([]);

    const { addItem: addToCart } = useCartStore();
    const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore();
    const { toast } = useToast();

    useEffect(() => {
        if (initialFeaturedProducts !== null) return;
        
        async function fetchFeaturedProducts() {
            try {
                const products = await apiService.getFeaturedProducts(200);
                setFeaturedProducts(products);
            } catch (err) {
                console.error('Failed to fetch featured products, using dummy data:', err);
                // Fallback to dummy data
                const dummyFeatured = getDummyFeatured();
                setFeaturedProducts(dummyFeatured.map(p => ({
                    id: p.id,
                    name: p.name,
                    slug: p.slug,
                    sku: p.sku,
                    short_description: p.short_description,
                    mrp: p.mrp,
                    selling_price: p.selling_price,
                    b2b_price: p.b2b_price,
                    stock_quantity: p.stock_quantity,
                    is_featured: p.is_featured,
                    primary_image: p.images[0]?.image_url || null,
                })));
            } finally {
                setLoading(false);
            }
        }

        fetchFeaturedProducts();
    }, [initialFeaturedProducts]);

    // Fetch brands with discount data
    useEffect(() => {
        productsApi.getFeaturedBrands()
            .then(data => setFeaturedBrands(data))
            .catch(() => {});
    }, []);

    const handleAddToCart = (product: APIProductSummary) => {
        const storeProduct: StoreProduct = {
            id: product.id,
            name: product.name,
            slug: product.slug,
            sku: product.sku,
            description: '',
            short_description: product.short_description || '',
            mrp: Number(product.mrp),
            selling_price: Number(product.selling_price),
            b2b_price: product.b2b_price ? Number(product.b2b_price) : 0,
            stock_quantity: product.stock_quantity,
            min_order_quantity: 1,
            unit: 'pcs',
            is_active: true,
            is_featured: product.is_featured,
            category_id: product.category_id || '',
            category_name: '',
            brand_id: '',
            brand_name: '',
            image_url: product.primary_image || undefined,
            images: product.primary_image ? [{ id: '1', image_url: product.primary_image, alt_text: product.name, is_primary: true }] : [],
        };
        addToCart(storeProduct, 1);
        toast({
            title: 'Added to Cart',
            description: `${product.name} added to your cart`,
            action: (
                <button
                    className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm font-medium hover:bg-primary/90"
                    onClick={() => router.push('/cart')}
                >
                    View Cart
                </button>
            ),
        });
    };

    const handleToggleWishlist = (product: APIProductSummary) => {
        const storeProduct: StoreProduct = {
            id: product.id,
            name: product.name,
            slug: product.slug,
            sku: product.sku,
            description: '',
            short_description: product.short_description || '',
            mrp: Number(product.mrp),
            selling_price: Number(product.selling_price),
            b2b_price: product.b2b_price ? Number(product.b2b_price) : 0,
            stock_quantity: product.stock_quantity,
            min_order_quantity: 1,
            unit: 'pcs',
            is_active: true,
            is_featured: product.is_featured,
            category_id: product.category_id || '',
            category_name: '',
            brand_id: '',
            brand_name: '',
            image_url: product.primary_image || undefined,
            images: product.primary_image ? [{ id: '1', image_url: product.primary_image, alt_text: product.name, is_primary: true }] : [],
        };

        if (isInWishlist(product.id)) {
            removeFromWishlist(product.id);
            toast({ title: 'Removed from Wishlist' });
        } else {
            addToWishlist(storeProduct);
            toast({
                title: 'Added to Wishlist',
                action: (
                    <button
                        className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm font-medium hover:bg-primary/90"
                        onClick={() => router.push('/wishlist')}
                    >
                        View Wishlist
                    </button>
                ),
            });
        }
    };

    const features = [
        {
            icon: Truck,
            title: 'Free Shipping',
            description: 'On orders above ₹5,000',
        },
        {
            icon: Shield,
            title: '100% Genuine',
            description: 'Authentic products only',
        },
        {
            icon: Sparkles,
            title: 'Wholesale Pricing',
            description: 'Exclusive dealer rates',
        },
    ];

    const categoryImages: Record<string, string> = {
        'lipsticks': 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400',
        'foundations': 'https://images.unsplash.com/photo-1631214540553-ff044a3ff1d4?w=400',
        'eye-makeup': 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400',
        'skincare': 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400',
    };

    return (
        <div className="min-h-screen flex flex-col">
            <PromoBanner />
            <Header />

            <main className="flex-1">
                <div className="container py-4">
                    <BannerSlider initialBanners={initialBanners} />
                </div>

                {/* Shop by Brand — dynamic from DB */}
                {featuredBrands.length > 0 && (
                    <section className="py-12 bg-gradient-to-br from-rose-50 via-white to-amber-50 border-y border-rose-100/70">
                        <div className="container">
                            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-8">
                                <div className="max-w-2xl">
                                    <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#d81b60] shadow-sm ring-1 ring-rose-100">
                                        <Sparkles className="h-3.5 w-3.5" />
                                        Brand offers live now
                                    </div>
                                    <h2 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight text-slate-950">
                                        Shop by Brand. Get Better Discounts.
                                    </h2>
                                    <p className="mt-3 text-slate-600 text-base md:text-lg">
                                        Explore trusted beauty and personal-care brands with the strongest deals highlighted upfront.
                                    </p>
                                </div>
                                <Link href="/products" className="inline-flex items-center gap-2 text-sm font-bold text-[#d81b60] hover:text-[#b9164f]">
                                    View all products
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                                {featuredBrands.map((brand) => (
                                    <Link
                                        key={brand.id}
                                        href={`/products?brand_id=${brand.id}`}
                                        className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 transition-all hover:-translate-y-1 hover:shadow-xl hover:ring-rose-200"
                                    >
                                        <div className="relative h-32 md:h-36 flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-white">
                                            <div className="absolute left-3 top-3 rounded-full bg-[#d81b60] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
                                                {brand.max_discount && brand.max_discount > 0 ? `Up to ${brand.max_discount}% off` : 'Hot deals'}
                                            </div>
                                            {brand.logo_url ? (
                                                <div className="h-full w-full flex items-center justify-center">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={brand.logo_url}
                                                        alt={brand.name}
                                                        className="max-h-full max-w-full object-contain mix-blend-multiply transition-transform group-hover:scale-105"
                                                        loading="lazy"
                                                    />
                                                </div>
                                            ) : (
                                                <span className="text-xl font-extrabold text-slate-800 tracking-tight group-hover:text-primary transition-colors text-center">
                                                    {brand.name}
                                                </span>
                                            )}
                                        </div>
                                        <div className="p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-extrabold text-slate-900 line-clamp-1">{brand.name}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">Featured brand picks</p>
                                                </div>
                                                <div className="h-9 w-9 rounded-full bg-rose-50 text-[#d81b60] flex items-center justify-center transition-colors group-hover:bg-[#d81b60] group-hover:text-white">
                                                    <ArrowRight className="h-4 w-4" />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>

                            <div className="mt-8 grid gap-3 md:grid-cols-3">
                                <div className="rounded-xl bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-white">
                                    Verified brand catalog
                                </div>
                                <div className="rounded-xl bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-white">
                                    Better margins on bulk orders
                                </div>
                                <div className="rounded-xl bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-white">
                                    Fresh deals before Trending Now
                                </div>
                            </div>
                        </div>
                    </section>
                )}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <TrendingSlider 
                        products={featuredProducts.map(product => ({
                            id: product.id,
                            name: product.name,
                            slug: product.slug,
                            sku: product.sku,
                            short_description: product.short_description || '',
                            mrp: Number(product.mrp),
                            selling_price: Number(product.selling_price),
                            b2b_price: product.b2b_price ? Number(product.b2b_price) : undefined,
                            stock_quantity: product.stock_quantity,
                            min_order_quantity: 1,
                            unit: 'pcs',
                            is_active: true,
                            is_featured: product.is_featured,
                            image_url: product.primary_image || undefined,
                            images: product.primary_image ? [{ 
                                id: 'p1', 
                                product_id: product.id, 
                                image_url: product.primary_image, 
                                is_primary: true,
                                sort_order: 0
                            }] : [],
                            attributes: {},
                            created_at: '',
                            updated_at: ''
                        } as APIProduct))}
                    />
                )}

                {/* Features - Moved below Trending Now */}
                <section className="py-12 border-b">
                    <div className="container">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {features.map((feature) => (
                                <div key={feature.title} className="flex flex-col items-center text-center gap-3 p-6 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                                    <div className="h-16 w-16 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 text-primary">
                                        <feature.icon className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg mb-1">{feature.title}</h3>
                                        <p className="text-slate-600">
                                            {feature.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* The Wholesale Advantage */}
                <section className="py-16 bg-[#fdfaf3] border-y border-[#f0e6d2]">
                    <div className="container text-center max-w-5xl">
                        <h3 className="text-sm font-bold tracking-widest uppercase text-slate-500 mb-2">The Wholesale Advantage</h3>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
                            Grow Your Business with Pranjay Wholesale
                        </h2>
                        <p className="text-lg text-slate-600 mb-12">
                            Unlock premium margins and priority support when you buy in bulk.
                        </p>

                        <div className="grid md:grid-cols-3 gap-8 mb-12">
                            <div className="space-y-4">
                                <div className="mx-auto w-16 h-16 bg-[#f0e6d2] rounded-full flex items-center justify-center">
                                    <span className="text-2xl">🪙</span>
                                </div>
                                <h4 className="font-bold text-lg text-slate-900">Tiered Discounts</h4>
                                <p className="text-slate-600 text-sm">Save up to 80% on large wholesale orders.</p>
                            </div>
                            <div className="space-y-4">
                                <div className="mx-auto w-16 h-16 bg-[#f0e6d2] rounded-full flex items-center justify-center">
                                    <span className="text-2xl">📦</span>
                                </div>
                                <h4 className="font-bold text-lg text-slate-900">Fast Bulk Dispatch</h4>
                                <p className="text-slate-600 text-sm">Priority shipping lane for B2B partners.</p>
                            </div>
                            <div className="space-y-4">
                                <div className="mx-auto w-16 h-16 bg-[#f0e6d2] rounded-full flex items-center justify-center">
                                    <span className="text-2xl">📞</span>
                                </div>
                                <h4 className="font-bold text-lg text-slate-900">Dedicated Support</h4>
                                <p className="text-slate-600 text-sm">Direct line for order tracking and assistance.</p>
                            </div>
                        </div>

                        <div className="flex justify-center gap-4">
                            <Link href="/login?type=seller">
                                <Button size="lg" className="bg-[#d81b60] hover:bg-[#c2185b] text-white rounded-full px-8 border-0">Register as Wholesaler</Button>
                            </Link>
                            <Link href="/products">
                                <Button size="lg" className="bg-[#cca152] hover:bg-[#b88c3d] text-white rounded-full px-8 border-0">View Bulk Pricing</Button>
                            </Link>
                        </div>
                    </div>
                </section>



                {/* Newsletter Community */}
                <section className="bg-[#3b2333] text-white py-16">
                    <div className="container max-w-3xl text-center space-y-6">
                        <h2 className="text-3xl font-bold">Join the Pranjay Community</h2>
                        <p className="text-pink-100">Get 10% Off Your First Retail Order & Exclusive Wholesale Alerts</p>
                        <form 
                            className="flex max-w-md mx-auto gap-2" 
                            onSubmit={(e) => { 
                                e.preventDefault(); 
                                toast({ title: "Subscribed Successfully!", description: "You've joined the Pranjay community." });
                                (e.target as HTMLFormElement).reset();
                            }}
                        >
                            <Input placeholder="Enter your email address..." className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12 rounded-lg" required type="email" />
                            <Button type="submit" className="bg-[#cca152] hover:bg-[#b88c3d] text-white h-12 px-8 rounded-lg border-0">Subscribe</Button>
                        </form>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
