'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Heart, ShoppingCart, ArrowLeft, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { apiService, APIProduct } from '@/lib/api-service';
import { dummyProducts, Product } from '@/lib/dummy-data';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { useToast } from '@/hooks/use-toast';
import { formatPrice, getDiscountPercentage } from '@/lib/utils';

function SearchContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get('q') || '';
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<APIProduct[]>([]);
    const [loading, setLoading] = useState(false);

    const { addItem: addToCart } = useCartStore();
    const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore();
    const { toast } = useToast();

    useEffect(() => {
        async function searchProducts() {
            if (!query.trim()) {
                setResults([]);
                return;
            }

            setLoading(true);
            try {
                const response = await apiService.searchProducts(query);
                setResults(response.items);
            } catch (err) {
                console.error('API search failed, falling back to local search:', err);
                // Fallback to local search
                const filtered = dummyProducts.filter(product =>
                    product.name.toLowerCase().includes(query.toLowerCase()) ||
                    product.description.toLowerCase().includes(query.toLowerCase()) ||
                    product.brand_name.toLowerCase().includes(query.toLowerCase()) ||
                    product.category_name.toLowerCase().includes(query.toLowerCase())
                );
                setResults(filtered.map(p => ({
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

        const debounce = setTimeout(searchProducts, 300);
        return () => clearTimeout(debounce);
    }, [query]);

    const handleAddToCart = (product: APIProduct) => {
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
        <main className="flex-1 py-8">
            <div className="container">
                <Link href="/products">
                    <Button variant="ghost" className="mb-4">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Products
                    </Button>
                </Link>

                <div className="max-w-2xl mx-auto mb-8">
                    <h1 className="text-3xl font-bold text-center mb-6">Search Products</h1>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search for lipsticks, foundations, skincare..."
                            className="pl-12 h-14 text-lg"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                {query.trim() && !loading && (
                    <p className="text-muted-foreground text-center mb-8">
                        {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
                    </p>
                )}

                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">Searching...</span>
                    </div>
                )}

                {!loading && results.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {results.map((product) => {
                            const discount = getDiscountPercentage(product.mrp, product.selling_price);
                            const inWishlist = isInWishlist(product.id);

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

                {!loading && query.trim() && results.length === 0 && (
                    <div className="text-center py-12">
                        <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h2 className="text-xl font-semibold mb-2">No products found</h2>
                        <p className="text-muted-foreground mb-6">
                            Try searching with different keywords
                        </p>
                        <Link href="/products">
                            <Button>Browse All Products</Button>
                        </Link>
                    </div>
                )}

                {!loading && !query.trim() && (
                    <div className="text-center py-12">
                        <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Start typing to search</h2>
                        <p className="text-muted-foreground">
                            Search for products by name, brand, or category
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}

export default function SearchPage() {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <Suspense fallback={
                <main className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </main>
            }>
                <SearchContent />
            </Suspense>
            <Footer />
        </div>
    );
}
