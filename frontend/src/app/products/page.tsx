'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { Filter, Heart, ShoppingCart, Grid3X3, List, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { useToast } from '@/hooks/use-toast';
import { formatPrice, getDiscountPercentage } from '@/lib/utils';
import { apiService, APIProduct } from '@/lib/api-service';
import { Product, dummyProducts } from '@/lib/dummy-data';

export default function ProductsPage() {
    const searchParams = useSearchParams();
    const categoryId = searchParams.get('category');

    const router = useRouter();
    const [products, setProducts] = useState<APIProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const { addItem: addToCart } = useCartStore();
    const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore();
    const { toast } = useToast();

    useEffect(() => {
        async function fetchProducts() {
            setLoading(true);
            setError(null);
            try {
                const response = await apiService.getProducts({
                    page_size: 20,
                    category_id: categoryId || undefined,
                });
                setProducts(response.items);
            } catch (err) {
                console.error('Failed to fetch products from API, falling back to dummy data:', err);
                // Fallback to dummy data if API fails
                setProducts(dummyProducts.map(p => ({
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

        fetchProducts();
    }, [categoryId]);

    const handleAddToCart = (product: APIProduct) => {
        // Convert API product to store format
        const storeProduct: Product = {
            id: product.id,
            name: product.name,
            slug: product.slug,
            sku: product.sku,
            description: '',
            short_description: product.short_description,
            mrp: product.mrp,
            selling_price: product.selling_price,
            b2b_price: product.b2b_price,
            stock_quantity: product.stock_quantity,
            min_order_quantity: 1,
            unit: 'pcs',
            is_active: true,
            is_featured: product.is_featured,
            category_id: '',
            category_name: '',
            brand_id: '',
            brand_name: '',
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

    const handleToggleWishlist = (product: APIProduct) => {
        const storeProduct: Product = {
            id: product.id,
            name: product.name,
            slug: product.slug,
            sku: product.sku,
            description: '',
            short_description: product.short_description,
            mrp: product.mrp,
            selling_price: product.selling_price,
            b2b_price: product.b2b_price,
            stock_quantity: product.stock_quantity,
            min_order_quantity: 1,
            unit: 'pcs',
            is_active: true,
            is_featured: product.is_featured,
            category_id: '',
            category_name: '',
            brand_id: '',
            brand_name: '',
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

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 py-8">
                <div className="container">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-bold">All Products</h1>
                            <p className="text-muted-foreground mt-1">
                                {loading ? 'Loading...' : `${products.length} products found`}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant={viewMode === 'grid' ? 'default' : 'outline'}
                                size="icon"
                                onClick={() => setViewMode('grid')}
                            >
                                <Grid3X3 className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'default' : 'outline'}
                                size="icon"
                                onClick={() => setViewMode('list')}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="ml-2 text-muted-foreground">Loading products...</span>
                        </div>
                    )}

                    {/* Products Grid */}
                    {!loading && products.length > 0 && (
                        <div className={viewMode === 'grid'
                            ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                            : "space-y-4"
                        }>
                            {products.map((product) => {
                                const discount = getDiscountPercentage(product.mrp, product.selling_price);
                                const inWishlist = isInWishlist(product.id);

                                if (viewMode === 'list') {
                                    return (
                                        <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-all">
                                            <div className="flex">
                                                <div className="relative w-40 h-40 shrink-0">
                                                    <Link href={`/products/${product.slug}`}>
                                                        <Image
                                                            src={product.primary_image || '/placeholder.jpg'}
                                                            alt={product.name}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </Link>
                                                </div>
                                                <CardContent className="flex-1 p-4 flex flex-col justify-between">
                                                    <div>
                                                        <Link href={`/products/${product.slug}`}>
                                                            <h3 className="font-medium hover:text-primary transition-colors">
                                                                {product.name}
                                                            </h3>
                                                        </Link>
                                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                            {product.short_description}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-lg font-bold text-primary">
                                                                {formatPrice(product.selling_price)}
                                                            </span>
                                                            {discount > 0 && (
                                                                <span className="text-sm text-muted-foreground line-through">
                                                                    {formatPrice(product.mrp)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <Button size="sm" onClick={() => handleAddToCart(product)}>
                                                            Add to Cart
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </div>
                                        </Card>
                                    );
                                }

                                return (
                                    <Card key={product.id} className="group overflow-hidden hover:shadow-lg transition-all">
                                        <div className="relative aspect-square overflow-hidden bg-muted">
                                            <Link href={`/products/${product.slug}`}>
                                                <Image
                                                    src={product.primary_image || '/placeholder.jpg'}
                                                    alt={product.name}
                                                    fill
                                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                />
                                            </Link>

                                            {discount > 0 && (
                                                <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded">
                                                    {discount}% OFF
                                                </span>
                                            )}

                                            <button
                                                className={`absolute top-2 right-2 h-8 w-8 rounded-full flex items-center justify-center transition-all ${inWishlist ? 'bg-primary text-white' : 'bg-white/80 hover:bg-white'
                                                    }`}
                                                onClick={() => handleToggleWishlist(product)}
                                            >
                                                <Heart className={`h-4 w-4 ${inWishlist ? 'fill-current' : ''}`} />
                                            </button>
                                        </div>

                                        <CardContent className="p-4">
                                            <Link href={`/products/${product.slug}`}>
                                                <h3 className="font-medium truncate hover:text-primary transition-colors">
                                                    {product.name}
                                                </h3>
                                            </Link>

                                            <div className="mt-3 flex items-center gap-2">
                                                <span className="text-lg font-bold text-primary">
                                                    {formatPrice(product.selling_price)}
                                                </span>
                                                {discount > 0 && (
                                                    <span className="text-sm text-muted-foreground line-through">
                                                        {formatPrice(product.mrp)}
                                                    </span>
                                                )}
                                            </div>

                                            <Button
                                                className="w-full mt-4"
                                                size="sm"
                                                onClick={() => handleAddToCart(product)}
                                            >
                                                <ShoppingCart className="h-4 w-4 mr-2" />
                                                Add to Cart
                                            </Button>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && products.length === 0 && (
                        <div className="text-center py-20">
                            <p className="text-muted-foreground">No products found</p>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
