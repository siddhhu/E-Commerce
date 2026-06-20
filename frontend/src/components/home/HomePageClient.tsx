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
import { categoriesApi, ProductSummary, CategoryRead } from '@/lib/api';
import { dummyProducts, getFeaturedProducts as getDummyFeatured, categories, Product as StoreProduct } from '@/lib/dummy-data';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/utils';
import { BannerSlider } from '@/components/shop/BannerSlider';
import { ProductCard } from '@/components/products/ProductCard';
import { Product as APIProduct } from '@/lib/api';
import { PromoBanner } from '@/components/layout/PromoBanner';
import { TrendingSlider } from '@/components/shop/TrendingSlider';
import { CheckCircle2, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function HomePageClient({ 
    initialFeaturedProducts = null,
    initialBanners = null,
    initialCategories = null
}: { 
    initialFeaturedProducts?: APIProductSummary[] | null,
    initialBanners?: any[] | null,
    initialCategories?: CategoryRead[] | null
}) {
    const router = useRouter();
    const { isAuthenticated, user } = useAuthStore();
    const [featuredProducts, setFeaturedProducts] = useState<APIProductSummary[]>(initialFeaturedProducts || []);
    const [loading, setLoading] = useState(!initialFeaturedProducts);
    const [homeCategories, setHomeCategories] = useState<CategoryRead[]>(
        (initialCategories || []).filter((category) => category.is_active).slice(0, 8)
    );
    const [discountedProducts, setDiscountedProducts] = useState<APIProductSummary[]>([]);
    const [discountsLoading, setDiscountsLoading] = useState(true);


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

    // Fetch only data that was not pre-rendered by the homepage server component.
    useEffect(() => {
        if (initialCategories === null) {
            categoriesApi.list()
                .then(data => setHomeCategories(data.filter((category) => category.is_active).slice(0, 8)))
                .catch(() => {});
        }
    }, [initialCategories]);

    // Fetch admin-curated discounted products
    useEffect(() => {
        apiService.getDiscountedFeaturedProducts(20)
            .then(data => setDiscountedProducts(data))
            .catch(() => {})
            .finally(() => setDiscountsLoading(false));
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
            title: 'Free Delivery',
            description: 'On orders ₹1,500+',
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

    const getImageUrl = (url?: string | null) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';
        return `${baseUrl}${url}`;
    };

    const mapFeaturedToProduct = (product: APIProductSummary): APIProduct => ({
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
    } as APIProduct);

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <PromoBanner />

            <main className="flex-1">
                <div className="container py-4">
                    <BannerSlider initialBanners={initialBanners} />
                </div>

                {homeCategories.length > 0 && (
                    <section className="py-8 bg-white">
                        <div className="container">
                            <div className="flex items-end justify-between gap-4 mb-5">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Shop smarter</p>
                                    <h2 className="text-2xl md:text-3xl font-extrabold text-slate-950 mt-1">Browse Beauty Categories</h2>
                                </div>
                                <Link href="/products" className="hidden sm:inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
                                    Explore all <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                                {homeCategories.map((category) => (
                                    <Link
                                        key={category.id}
                                        href={`/products?category=${category.id}`}
                                        className="group overflow-hidden rounded-2xl border border-rose-100 bg-white text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                                    >
                                        <div className="relative h-24 w-full overflow-hidden bg-gradient-to-br from-rose-50 to-amber-50 sm:h-28">
                                            {getImageUrl(category.image_url) ? (
                                                <img src={getImageUrl(category.image_url)!} alt={category.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#e91e63]/15 to-amber-100 text-2xl font-black text-primary/50">
                                                    {category.name.slice(0, 1).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3">
                                            <p className="line-clamp-2 text-xs font-extrabold text-slate-900 group-hover:text-primary">{category.name}</p>
                                            <p className="mt-1 text-[11px] font-semibold text-slate-400">Shop now</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* Live Discounts — admin-curated products with is_discounted_featured=true */}
                {!discountsLoading && discountedProducts.length > 0 && (
                    <section className="py-10 bg-[#fff7fb] border-y border-rose-100">
                        <div className="container">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                                <div>
                                    <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#d81b60] shadow-sm">
                                        <Sparkles className="h-3.5 w-3.5" /> Live product discounts
                                    </p>
                                    <h2 className="mt-3 text-2xl md:text-4xl font-extrabold text-slate-950">Today&apos;s Beauty Steals</h2>
                                    <p className="mt-2 text-slate-600">Hand-picked by our team — the best deals available right now.</p>
                                </div>
                                <Link href="/products?min_discount=1" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
                                    Shop more deals <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                                {discountedProducts.map((product) => (
                                    <ProductCard
                                        key={product.id}
                                        product={mapFeaturedToProduct(product)}
                                        onAddToCart={() => handleAddToCart(product)}
                                        onAddToWishlist={() => handleToggleWishlist(product)}
                                    />
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                <section className="py-10 bg-white">
                    <div className="container">
                        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                            <div className="rounded-2xl bg-[#2f1727] text-white p-6 md:p-8 overflow-hidden relative">
                                <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#e91e63]/30 blur-2xl" />
                                <div className="relative max-w-xl">
                                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-pink-200">Beauty edit</p>
                                    <h2 className="mt-3 text-2xl md:text-4xl font-extrabold leading-tight">
                                        Curated cosmetic deals for daily glam and wholesale shelves.
                                    </h2>
                                    <p className="mt-3 text-sm md:text-base text-pink-100">
                                        Find fast-moving makeup, skincare, and salon essentials with pricing that works for both retail shoppers and business buyers.
                                    </p>
                                    <div className="mt-6 flex flex-wrap gap-3">
                                        <Link href="/products?search=makeup" className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#2f1727] hover:bg-pink-50 transition-colors">
                                            Makeup picks
                                        </Link>
                                        <Link href="/products?search=skincare" className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/20 hover:bg-white/20 transition-colors">
                                            Skincare deals
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Link href="/products?search=lipstick" className="rounded-2xl border border-rose-100 bg-rose-50 p-5 hover:shadow-lg transition-all">
                                    <p className="text-xs font-bold uppercase tracking-wide text-[#d81b60]">Color cosmetics</p>
                                    <h3 className="mt-2 text-lg font-extrabold text-slate-950">Lipsticks, liners and more</h3>
                                    <p className="mt-2 text-xs text-slate-600">High-demand beauty staples.</p>
                                </Link>
                                <Link href="/products?search=facial" className="rounded-2xl border border-amber-100 bg-amber-50 p-5 hover:shadow-lg transition-all">
                                    <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Skin glow</p>
                                    <h3 className="mt-2 text-lg font-extrabold text-slate-950">Facials and skincare kits</h3>
                                    <p className="mt-2 text-xs text-slate-600">Great for salon counters.</p>
                                </Link>
                                <Link href="/products?search=shampoo" className="rounded-2xl border border-slate-200 bg-slate-50 p-5 hover:shadow-lg transition-all">
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Hair care</p>
                                    <h3 className="mt-2 text-lg font-extrabold text-slate-950">Daily care essentials</h3>
                                    <p className="mt-2 text-xs text-slate-600">Useful, repeat-order products.</p>
                                </Link>
                                <Link href="/products" className="rounded-2xl border border-pink-100 bg-white p-5 hover:shadow-lg transition-all">
                                    <p className="text-xs font-bold uppercase tracking-wide text-[#d81b60]">Explore all</p>
                                    <h3 className="mt-2 text-lg font-extrabold text-slate-950">Browse full catalog</h3>
                                    <p className="mt-2 text-xs text-slate-600">Discover more offers.</p>
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <TrendingSlider 
                        products={featuredProducts.map(product => ({
                            ...mapFeaturedToProduct(product)
                        }))}
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
                                <p className="text-slate-600 text-sm">Priority dispatch lane for B2B partners.</p>
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
                <section className="relative overflow-hidden bg-gradient-to-br from-[#2a1425] via-[#3b1730] to-[#5a1f45] text-white py-12 sm:py-16">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(236,72,153,0.26),transparent_28%),radial-gradient(circle_at_84%_70%,rgba(204,161,82,0.28),transparent_24%)]" />
                    <div className="container relative max-w-4xl text-center space-y-6 px-4">
                        <div className="mx-auto inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-pink-100">
                            Beauty insider club
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Join the Pranjay Community</h2>
                            <p className="mx-auto max-w-2xl text-sm leading-6 text-pink-100 sm:text-base">
                                Get retail offers, wholesale alerts, salon picks, and early access to trending cosmetic deals.
                            </p>
                        </div>
                        <form 
                            className="mx-auto flex max-w-xl flex-col gap-3 rounded-2xl border border-white/10 bg-white/10 p-2 shadow-2xl shadow-pink-950/20 backdrop-blur sm:flex-row"
                            onSubmit={(e) => { 
                                e.preventDefault(); 
                                toast({ title: "Subscribed Successfully!", description: "You've joined the Pranjay community." });
                                (e.target as HTMLFormElement).reset();
                            }}
                        >
                            <Input placeholder="Enter your email address..." className="h-12 flex-1 rounded-xl border-white/10 bg-white text-slate-900 placeholder:text-slate-400" required type="email" />
                            <Button type="submit" className="h-12 rounded-xl border-0 bg-[#cca152] px-8 font-bold text-white hover:bg-[#b88c3d] sm:w-auto">Subscribe</Button>
                        </form>
                        <div className="grid gap-3 text-xs text-pink-100 sm:grid-cols-3">
                            <span>Genuine brands</span>
                            <span>Fast dispatch updates</span>
                            <span>Wholesale deal alerts</span>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
