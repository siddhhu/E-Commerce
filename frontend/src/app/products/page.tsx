'use client';

import { useState, useEffect, Suspense } from 'react';
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
import { productsApi, ProductSummary, Product as APIProduct } from '@/lib/api';
import { Product as StoreProduct } from '@/lib/dummy-data';
import { ProductCard } from '@/components/products/ProductCard';

function ProductsContent() {
    const searchParams = useSearchParams();
    const categoryId = searchParams.get('category');

    const router = useRouter();
    const [products, setProducts] = useState<ProductSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const { addItem: addToCart } = useCartStore();
    const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore();
    const { toast } = useToast();

    useEffect(() => {
        // Reset state when category changes
        setPage(1);
        setProducts([]);
        fetchProducts(1, true);
    }, [categoryId]);

    async function fetchProducts(pageNum: number, isInitial: boolean = false) {
        if (isInitial) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }
        setError(null);
        try {
            const response = await productsApi.list({
                page: pageNum,
                page_size: 20,
                category_id: categoryId || undefined,
            });
            
            if (isInitial) {
                setProducts(response.items);
            } else {
                setProducts(prev => [...prev, ...response.items]);
            }
            setTotal(response.total);
        } catch (err) {
            console.error('Failed to fetch products from API:', err);
            setError('Failed to load products. Please try again later.');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchProducts(nextPage);
    };

    const handleAddToCart = (product: ProductSummary) => {
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

    const handleToggleWishlist = (product: ProductSummary) => {
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
                        // Map ProductSummary to the Product type expected by ProductCard
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

                        if (viewMode === 'list') {
                            const discount = getDiscountPercentage(product.mrp, product.selling_price);
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
                                                    // Simple fallback for list view
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = '/placeholder.jpg';
                                                    }}
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

            {/* Load More */}
            {!loading && products.length < total && (
                <div className="flex justify-center mt-12 mb-8">
                    <Button 
                        variant="outline" 
                        size="lg" 
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="min-w-[200px]"
                    >
                        {loadingMore ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading...
                            </>
                        ) : (
                            'Load More Products'
                        )}
                    </Button>
                </div>
            )}

            {/* Empty State */}
            {!loading && products.length === 0 && (
                <div className="text-center py-20">
                    <p className="text-muted-foreground">No products found</p>
                </div>
            )}
        </div>
    );
}

export default function ProductsPage() {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 py-8">
                <Suspense fallback={
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">Loading products...</span>
                    </div>
                }>
                    <ProductsContent />
                </Suspense>
            </main>

            <Footer />
        </div>
    );
}
