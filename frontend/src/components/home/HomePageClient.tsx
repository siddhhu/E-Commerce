'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
                const products = await apiService.getFeaturedProducts(8);
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
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        fetch(`${API_BASE}/api/v1/products/brands/featured`)
            .then(res => res.json())
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
                {/* Hero / Banner Section */}
                <section className="py-12 md:py-20 bg-white relative overflow-hidden">
                    <div className="container relative z-10">
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            <div className="space-y-6 max-w-xl">
                                <h1 className="text-4xl md:text-5xl lg:text-[64px] leading-[1.1] font-extrabold tracking-tight text-[#0a142f]">
                                    Premium Cosmetics at<br />
                                    <span className="text-[#d81b60]">Wholesale Prices</span>
                                </h1>
                                <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-md">
                                    Your trusted wholesale cosmetics partner. Access exclusive deals on authentic products from top brands.
                                </p>
                                <div className="flex flex-wrap items-center gap-4 pt-2">
                                    <Link href="/products">
                                        <Button size="lg" className="bg-[#d81b60] hover:bg-[#c2185b] text-white rounded-lg px-6 h-12 text-base font-semibold border-0 shadow-md">
                                            Browse Products <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </Link>
                                    {isAuthenticated ? (
                                        <Link href={user?.role === 'admin' || user?.role === 'super_admin' ? '/admin' : '/orders'}>
                                            <Button variant="outline" size="lg" className="rounded-lg px-6 h-12 text-base font-semibold border-slate-200 text-slate-700 hover:bg-slate-50">
                                                My Dashboard
                                            </Button>
                                        </Link>
                                    ) : (
                                        <Link href="/login">
                                            <Button variant="outline" size="lg" className="rounded-lg px-6 h-12 text-base font-semibold border-slate-200 text-slate-700 hover:bg-slate-50">
                                                My Dashboard
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </div>
                            <div className="relative">
                                <div className="aspect-[4/3] relative rounded-3xl overflow-hidden shadow-xl transform rotate-2">
                                    <Image
                                        src="https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=1200"
                                        alt="Premium Cosmetics Collection"
                                        fill
                                        className="object-cover"
                                        priority
                                    />
                                    {/* Soft overlay to match the flatlay background */}
                                    <div className="absolute inset-0 bg-[#e6d5c3]/20 mix-blend-multiply" />
                                </div>
                                {/* Decorative elements */}
                                <div className="absolute -z-10 -top-10 -right-10 w-64 h-64 bg-pink-100/50 rounded-full blur-3xl" />
                                <div className="absolute -z-10 -bottom-10 -left-10 w-64 h-64 bg-amber-100/50 rounded-full blur-3xl" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features */}
                <section className="py-12 border-b">
                    <div className="container">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {features.map((feature) => (
                                <div key={feature.title} className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <feature.icon className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium">{feature.title}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {feature.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Trending Now */}
                <section className="py-12 bg-white">
                    <div className="container">
                        <div className="flex flex-col items-center mb-8">
                            <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                                🔥 Trending Now
                            </h2>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="relative group">
                                <button 
                                    onClick={() => document.getElementById('trending-scroll')?.scrollBy({ left: -300, behavior: 'smooth' })} 
                                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white p-3 rounded-full shadow-lg hidden group-hover:block border border-slate-100 hover:bg-slate-50 transition-all text-[#d81b60]"
                                >
                                    <ArrowRight className="h-5 w-5 rotate-180" />
                                </button>
                                <div id="trending-scroll" className="flex overflow-x-auto pb-6 gap-6 snap-x hide-scrollbar scroll-smooth">
                                {featuredProducts.map((product) => {
                                    const cardProduct: APIProduct = {
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
                                    };

                                    return (
                                        <div key={product.id} className="min-w-[280px] max-w-[280px] snap-start">
                                            <ProductCard 
                                                product={cardProduct}
                                                onAddToCart={() => handleAddToCart(product)}
                                                onAddToWishlist={() => handleToggleWishlist(product)}
                                            />
                                        </div>
                                    );
                                })}
                                </div>
                                <button 
                                    onClick={() => document.getElementById('trending-scroll')?.scrollBy({ left: 300, behavior: 'smooth' })} 
                                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white p-3 rounded-full shadow-lg hidden group-hover:block border border-slate-100 hover:bg-slate-50 transition-all text-[#d81b60]"
                                >
                                    <ArrowRight className="h-5 w-5" />
                                </button>
                            </div>
                        )}
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

                {/* Shop by Brand — dynamic from DB */}
                {featuredBrands.length > 0 && (
                    <section className="py-12 bg-[#f8f8f8]">
                        <div className="container">
                            <h3 className="text-sm font-bold tracking-widest uppercase text-slate-500 mb-2 text-center">Shop by Brand</h3>
                            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-8 text-center">Top Brands with Best Offers</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
                                {featuredBrands.map((brand) => (
                                    <Link
                                        key={brand.id}
                                        href={`/products?brand_id=${brand.id}`}
                                        className="bg-white rounded-xl p-6 flex flex-col items-center justify-center gap-3 border border-slate-100 hover:shadow-lg hover:border-primary/20 transition-all group cursor-pointer"
                                    >
                                        {brand.logo_url ? (
                                            <div className="h-16 w-32 relative">
                                                <Image
                                                    src={brand.logo_url}
                                                    alt={brand.name}
                                                    fill
                                                    className="object-contain group-hover:scale-105 transition-transform"
                                                />
                                            </div>
                                        ) : (
                                            <span className="text-xl font-extrabold text-slate-800 tracking-tight group-hover:text-primary transition-colors">
                                                {brand.name}
                                            </span>
                                        )}
                                        {brand.max_discount > 0 && (
                                            <span className="text-sm font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full">
                                                Upto {brand.max_discount}% Off
                                            </span>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

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
