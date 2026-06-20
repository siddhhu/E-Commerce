'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Filter, Heart, ShoppingCart, Grid3X3, List, Loader2, SlidersHorizontal, Sparkles, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { useToast } from '@/hooks/use-toast';
import { formatPrice, getDiscountPercentage, resolveImageUrl } from '@/lib/utils';
import { categoriesApi, productsApi, ProductSummary, Product as APIProduct, CategoryRead } from '@/lib/api';
import { Product as StoreProduct } from '@/lib/dummy-data';
import { ProductCard } from '@/components/products/ProductCard';
import { getProductLabels } from '@/lib/product-labels';

function ProductsContent() {
    const searchParams = useSearchParams();
    const categoryId = searchParams.get('category') || searchParams.get('category_id') || '';
    const brandId = searchParams.get('brand_id') || '';
    const searchQuery = searchParams.get('search') || searchParams.get('q') || '';
    const discountParam = searchParams.get('min_discount') || '';
    const minPriceParam = searchParams.get('min_price') || '';
    const maxPriceParam = searchParams.get('max_price') || '';
    const inStockParam = searchParams.get('in_stock') === 'true';

    const router = useRouter();
    const [products, setProducts] = useState<ProductSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [categories, setCategories] = useState<CategoryRead[]>([]);
    const [brands, setBrands] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState(categoryId);
    const [selectedBrand, setSelectedBrand] = useState(brandId);
    const [selectedDiscount, setSelectedDiscount] = useState(discountParam);
    const [priceBand, setPriceBand] = useState(minPriceParam || maxPriceParam ? `${minPriceParam || 0}-${maxPriceParam || 999999}` : '');
    const [inStockOnly, setInStockOnly] = useState(inStockParam);

    const { addItem: addToCart } = useCartStore();
    const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore();
    const { toast } = useToast();

    useEffect(() => {
        setSelectedCategory(categoryId);
        setSelectedBrand(brandId);
        setSelectedDiscount(discountParam);
        setPriceBand(minPriceParam || maxPriceParam ? `${minPriceParam || 0}-${maxPriceParam || 999999}` : '');
        setInStockOnly(inStockParam);
    }, [categoryId, brandId, discountParam, minPriceParam, maxPriceParam, inStockParam]);

    useEffect(() => {
        Promise.all([
            categoriesApi.list().then(setCategories).catch(() => setCategories([])),
            productsApi.getBrands().then(setBrands).catch(() => setBrands([])),
        ]);
    }, []);

    useEffect(() => {
        setPage(1);
        setProducts([]);
        fetchProducts(1, true);
    }, [selectedCategory, selectedBrand, selectedDiscount, priceBand, inStockOnly, searchQuery]);

    async function fetchProducts(pageNum: number, isInitial: boolean = false) {
        if (isInitial) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }
        setError(null);
        const [minPrice, maxPrice] = priceBand ? priceBand.split('-').map(Number) : [];
        try {
            const response = await productsApi.list({
                page: pageNum,
                page_size: 20,
                category_id: selectedCategory || undefined,
                brand_id: selectedBrand || undefined,
                search: searchQuery || undefined,
                min_price: minPrice || undefined,
                max_price: maxPrice || undefined,
                min_discount: selectedDiscount ? Number(selectedDiscount) : undefined,
                in_stock: inStockOnly || undefined,
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

    const updateQuery = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) params.set(key, value);
        else params.delete(key);
        router.replace(`/products?${params.toString()}`, { scroll: false });
    };

    const updatePriceQuery = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (!value) {
            params.delete('min_price');
            params.delete('max_price');
        } else {
            const [min, max] = value.split('-');
            params.set('min_price', min);
            params.set('max_price', max);
        }
        router.replace(`/products?${params.toString()}`, { scroll: false });
    };

    const clearFilters = () => {
        setSelectedCategory('');
        setSelectedBrand('');
        setSelectedDiscount('');
        setPriceBand('');
        setInStockOnly(false);
        router.replace('/products', { scroll: false });
    };

    const activeFilterCount = [selectedCategory, selectedBrand, selectedDiscount, priceBand, inStockOnly ? 'stock' : ''].filter(Boolean).length;

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
            is_discounted_featured: product.is_discounted_featured ?? false,
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
            is_discounted_featured: product.is_discounted_featured ?? false,
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

    return (
        <div className="container">
            <div className="mb-8 rounded-3xl bg-gradient-to-br from-[#321527] via-[#5b1b40] to-[#e91e63] p-6 md:p-9 text-white overflow-hidden relative">
                <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
                <div className="relative max-w-3xl">
                    <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide">
                        <Sparkles className="h-3.5 w-3.5" /> Pranjay Beauty Catalog
                    </p>
                    <h1 className="mt-4 text-3xl md:text-5xl font-extrabold tracking-tight">
                        Shop cosmetics, salon essentials and wholesale-ready deals.
                    </h1>
                    <p className="mt-3 text-pink-100">
                        Filter by brand, category, discount, price and stock to find the right product faster.
                    </p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
                <div>
                    <h2 className="text-2xl font-bold">All Products</h2>
                    <p className="text-muted-foreground mt-1">
                        {loading ? 'Loading...' : `${total} products found`}
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

            <div className="grid lg:grid-cols-[280px_1fr] gap-6">
                <aside className="lg:sticky lg:top-24 h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 font-bold text-slate-900">
                            <SlidersHorizontal className="h-4 w-4 text-primary" /> Filters
                        </div>
                        {activeFilterCount > 0 && (
                            <button onClick={clearFilters} className="text-xs font-bold text-primary hover:underline">Clear</button>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Category</label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => { setSelectedCategory(e.target.value); updateQuery('category', e.target.value); }}
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                            >
                                <option value="">All categories</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>{category.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Brand</label>
                            <select
                                value={selectedBrand}
                                onChange={(e) => { setSelectedBrand(e.target.value); updateQuery('brand_id', e.target.value); }}
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                            >
                                <option value="">All brands</option>
                                {brands.map((brand) => (
                                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Discount</label>
                            <div className="mt-2 grid grid-cols-2 gap-2">
                                {['10', '25', '40', '60'].map((value) => (
                                    <button
                                        key={value}
                                        onClick={() => {
                                            const nextValue = selectedDiscount === value ? '' : value;
                                            setSelectedDiscount(nextValue);
                                            updateQuery('min_discount', nextValue);
                                        }}
                                        className={`rounded-full border px-3 py-2 text-xs font-bold transition-colors ${selectedDiscount === value ? 'border-primary bg-primary text-white' : 'border-slate-200 hover:border-primary/50'}`}
                                    >
                                        {value}%+ off
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Price</label>
                            <select
                                value={priceBand}
                                onChange={(e) => {
                                    setPriceBand(e.target.value);
                                    updatePriceQuery(e.target.value);
                                }}
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                            >
                                <option value="">All prices</option>
                                <option value="0-199">Under ₹199</option>
                                <option value="200-499">₹200 - ₹499</option>
                                <option value="500-999">₹500 - ₹999</option>
                                <option value="1000-999999">₹1000+</option>
                            </select>
                        </div>

                        <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold">
                            In stock only
                            <input
                                type="checkbox"
                                checked={inStockOnly}
                                onChange={(e) => {
                                    setInStockOnly(e.target.checked);
                                    updateQuery('in_stock', e.target.checked ? 'true' : '');
                                }}
                                className="h-4 w-4 accent-primary"
                            />
                        </label>
                    </div>
                </aside>

                <div>

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
                    ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6"
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
                            is_discounted_featured: product.is_discounted_featured,
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
                            const labels = getProductLabels(product).slice(0, 3);
                            return (
                                <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-all">
                                    <div className="flex">
                                        <div className="relative w-40 h-40 shrink-0">
                                            <Link href={`/products/${product.slug}`}>
                                                <img
                                                    src={resolveImageUrl(product.primary_image)}
                                                    alt={product.name}
                                                    className="h-full w-full object-cover"
                                                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.jpg'; }}
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
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {labels.map((label) => (
                                                        <span key={label.text} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${label.className}`}>
                                                            {label.text}
                                                        </span>
                                                    ))}
                                                </div>
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
                                                <Button
                                                    size="sm"
                                                    disabled={product.stock_quantity <= 0}
                                                    onClick={() => handleAddToCart(product)}
                                                >
                                                    {product.stock_quantity <= 0 ? 'Out of Stock' : 'Add to Cart'}
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
                <div className="text-center py-20 rounded-2xl bg-slate-50 border">
                    <Filter className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                    <p className="font-bold text-slate-900">No products found</p>
                    <p className="text-muted-foreground mt-1">Try removing a filter or browsing all products.</p>
                    {activeFilterCount > 0 && (
                        <Button variant="outline" className="mt-4" onClick={clearFilters}>
                            <X className="h-4 w-4 mr-2" /> Clear Filters
                        </Button>
                    )}
                </div>
            )}
                </div>
            </div>
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
