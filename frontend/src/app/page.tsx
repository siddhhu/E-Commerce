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
import { dummyProducts, getFeaturedProducts as getDummyFeatured, categories, Product as StoreProduct } from '@/lib/dummy-data';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import { formatPrice, getDiscountPercentage } from '@/lib/utils';
import { BannerSlider } from '@/components/shop/BannerSlider';
import { ProductCard } from '@/components/products/ProductCard';
import { Product as APIProduct } from '@/lib/api';

export default function HomePage() {
    const router = useRouter();
    const { isAuthenticated, user } = useAuthStore();
    const [featuredProducts, setFeaturedProducts] = useState<APIProductSummary[]>([]);
    const [loading, setLoading] = useState(true);

    const { addItem: addToCart } = useCartStore();
    const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore();
    const { toast } = useToast();

    useEffect(() => {
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
            category_id: '',
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
            category_id: '',
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
            icon: Clock,
            title: 'Quick Delivery',
            description: '3-5 business days',
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
            <Header />

            <main className="flex-1">
                {/* Hero / Banner Section */}
                <section className="py-6 md:py-10">
                    <div className="container">
                        <BannerSlider />
                        
                        {/* Fallback Hero if no banners (only shows if BannerSlider returns null) */}
                        <div className="mt-10 lg:mt-16 grid lg:grid-cols-2 gap-12 items-center [&:has(+div)]:hidden">
                            <div className="space-y-6">
                                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                                    Premium Cosmetics at{' '}
                                    <span className="bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
                                        Wholesale Prices
                                    </span>
                                </h1>
                                <p className="text-lg text-muted-foreground max-w-md">
                                    Your trusted wholesale cosmetics partner. Access exclusive deals on
                                    authentic products from top brands.
                                </p>
                                <div className="flex flex-wrap gap-4">
                                    <Link href="/products">
                                        <Button size="lg" className="gap-2">
                                            Browse Products <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                    {isAuthenticated ? (
                                        <Link href={user?.role === 'admin' || user?.role === 'super_admin' ? '/admin' : '/orders'}>
                                            <Button variant="outline" size="lg">
                                                My Dashboard
                                            </Button>
                                        </Link>
                                    ) : (
                                        <Link href="/login">
                                            <Button variant="outline" size="lg">
                                                Get Wholesale Access
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </div>
                            <div className="relative aspect-square lg:aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl skew-y-1">
                                <Image
                                    src="https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800"
                                    alt="Premium Cosmetics Collection"
                                    fill
                                    className="object-cover"
                                    priority
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
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

                {/* Featured Products */}
                <section className="py-16">
                    <div className="container">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold">
                                    Featured Products
                                </h2>
                                <p className="text-muted-foreground mt-1">
                                    Our top picks for you
                                </p>
                            </div>
                            <Link href="/products">
                                <Button variant="outline" className="gap-2">
                                    View All <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <span className="ml-2 text-muted-foreground">Loading products...</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {featuredProducts.map((product) => {
                                    // Map APIProductSummary to APIProduct expected by ProductCard
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
                                        <ProductCard 
                                            key={product.id} 
                                            product={cardProduct}
                                            onAddToCart={() => handleAddToCart(product)}
                                            onAddToWishlist={() => handleToggleWishlist(product)}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>

                {/* Categories */}
                <section className="py-16 bg-muted/30">
                    <div className="container">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold">
                                    Shop by Category
                                </h2>
                                <p className="text-muted-foreground mt-1">
                                    Explore our wide range of cosmetics
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {categories.map((category) => (
                                <Link key={category.slug} href={`/products?category=${category.id}`}>
                                    <Card className="group overflow-hidden hover:shadow-lg transition-all">
                                        <div className="relative aspect-square bg-muted">
                                            <Image
                                                src={categoryImages[category.slug] || 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400'}
                                                alt={category.name}
                                                fill
                                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                                            <div className="absolute bottom-4 left-4 right-4">
                                                <h3 className="text-lg font-semibold text-white">
                                                    {category.name}
                                                </h3>
                                                <p className="text-sm text-white/80">
                                                    {category.count} products
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-16 bg-primary text-primary-foreground">
                    <div className="container text-center">
                        <h2 className="text-2xl md:text-3xl font-bold mb-4">
                            Ready to Start Your Wholesale Journey?
                        </h2>
                        <p className="text-primary-foreground/80 max-w-md mx-auto mb-8">
                            Join thousands of retailers who trust Pranjay for their cosmetics
                            supply.
                        </p>
                        {isAuthenticated ? (
                            <Link href={user?.role === 'admin' || user?.role === 'super_admin' ? '/admin' : '/orders'}>
                                <Button variant="secondary" size="lg" className="gap-2">
                                    Go to Dashboard <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        ) : (
                            <Link href="/login">
                                <Button variant="secondary" size="lg" className="gap-2">
                                    Get Started <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        )}
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
