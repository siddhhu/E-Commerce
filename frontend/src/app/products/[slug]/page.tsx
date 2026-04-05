'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingCart, Minus, Plus, ArrowLeft, Truck, Shield, RotateCcw, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useToast } from '@/hooks/use-toast';
import { dummyProducts, Product } from '@/lib/dummy-data';
import { productsApi, Product as APIProduct } from '@/lib/api';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { cn, formatPrice, getDiscountPercentage } from '@/lib/utils';

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [quantity, setQuantity] = useState(1);

    const [product, setProduct] = useState<APIProduct | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const { addItem: addToCart } = useCartStore();
    const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore();
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        async function fetchProduct() {
            if (!params.slug) return;
            setLoading(true);
            try {
                const data = await productsApi.getBySlug(params.slug as string);
                setProduct(data);
                setError(false);
            } catch (err) {
                console.error('Failed to fetch product:', err);
                setError(true);
            } finally {
                setLoading(false);
            }
        }
        fetchProduct();
    }, [params.slug]);

    useEffect(() => {
        if (!product) return;
        const minQty = Math.max(1, product.min_order_quantity || 1);
        const maxQty = Math.max(minQty, product.stock_quantity || minQty);
        setQuantity((q) => Math.min(Math.max(q, minQty), maxQty));
    }, [product]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Loading product...</span>
                </main>
                <Footer />
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold">Product Not Found</h1>
                        <p className="text-muted-foreground mt-2">The product youre looking for doesnt exist.</p>
                        <Link href="/products">
                            <Button className="mt-4">Browse Products</Button>
                        </Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    const discount = getDiscountPercentage(product.mrp, product.selling_price);
    const primaryImage = imgError
        ? '/placeholder.jpg'
        : (product.image_url || product.images?.find((img) => img.is_primary)?.image_url || product.images?.[0]?.image_url || '/placeholder.jpg');
    const inWishlist = isInWishlist(product.id);

    const minOrderQty = Math.max(1, product.min_order_quantity || 1);
    const maxQty = Math.max(minOrderQty, product.stock_quantity || minOrderQty);
    
    // Effective quantity shown to the user
    const displayQty = Math.min(Math.max(quantity, minOrderQty), maxQty);
    
    // Use wholesale price if quantity meets minimum
    const useWholesale = Boolean(product.b2b_price) && displayQty >= minOrderQty;
    const unitPrice = useWholesale ? Number(product.b2b_price) : Number(product.selling_price);
    
    // Total price based on quantity
    const totalPrice = unitPrice * displayQty;
    
    // GST Calculation (18%) for GST-inclusive prices
    const baseAmount = totalPrice / 1.18;
    const gstAmount = totalPrice - baseAmount;
    
    const remainingStock = Math.max(0, Number(product.stock_quantity) - displayQty);

    const mapToStoreProduct = (p: APIProduct): Product => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        description: p.description || '',
        short_description: p.short_description || '',
        mrp: Number(p.mrp),
        selling_price: Number(p.selling_price),
        b2b_price: p.b2b_price ? Number(p.b2b_price) : 0,
        stock_quantity: p.stock_quantity,
        min_order_quantity: p.min_order_quantity,
        unit: p.unit,
        is_active: p.is_active,
        is_featured: p.is_featured,
        category_id: p.category_id || '',
        category_name: '', // We don't have this in APIProduct but it's okay for store
        brand_id: p.brand_id || '',
        brand_name: '',
        images: p.images?.map(img => ({
            id: img.id,
            image_url: img.image_url,
            alt_text: img.alt_text || p.name,
            is_primary: img.is_primary
        })) || []
    });

    const handleAddToCart = () => {
        if (!product) return;
        addToCart(mapToStoreProduct(product), displayQty);
        toast({
            title: 'Added to Cart',
            description: `${displayQty}x ${product.name} added to your cart`,
        });
    };

    const handleBuyNow = () => {
        if (!product) return;
        addToCart(mapToStoreProduct(product), displayQty);
        router.push('/cart');
    };

    const handleToggleWishlist = () => {
        if (!product) return;
        if (inWishlist) {
            removeFromWishlist(product.id);
            toast({ title: 'Removed from Wishlist' });
        } else {
            addToWishlist(mapToStoreProduct(product));
            toast({ title: 'Added to Wishlist' });
        }
    };

    // Related products (same category)
    const relatedProducts = [] as any[]; // Simplified for now since we don't have easy fetch for this yet

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 py-8">
                <div className="container">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
                        <Link href="/" className="hover:text-primary">Home</Link>
                        <span>/</span>
                        <Link href="/products" className="hover:text-primary">Products</Link>
                        <span>/</span>
                        <span className="text-foreground">{product.name}</span>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-12">
                        {/* Product Image */}
                        <div className="space-y-4">
                            <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
                                <Image
                                    src={primaryImage}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                    priority
                                    onError={() => setImgError(true)}
                                />
                                {discount > 0 && (
                                    <span className="absolute top-4 left-4 bg-primary text-primary-foreground text-sm font-semibold px-3 py-1 rounded">
                                        {discount}% OFF
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Product Details */}
                        <div className="space-y-6">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-3xl font-bold">{product.name}</h1>
                                    {product.unit && (
                                        <span className="bg-muted text-muted-foreground text-sm px-2 py-0.5 rounded-full font-medium">
                                            {product.unit}
                                        </span>
                                    )}
                                </div>
                                <p className="text-muted-foreground mt-2">{product.short_description}</p>
                            </div>

                            {/* Pricing */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-4">
                                    <span className="text-5xl font-bold text-primary">
                                        {formatPrice(totalPrice)}
                                    </span>
                                    {discount > 0 && (
                                        <div className="flex flex-col">
                                            <span className="text-xl text-muted-foreground line-through">
                                                {formatPrice(product.mrp * displayQty)}
                                            </span>
                                            <span className="text-green-600 text-sm font-medium">
                                                Save {formatPrice((product.mrp - unitPrice) * displayQty)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                
                                {/* GST Breakdown */}
                                <div className="text-sm text-muted-foreground border-l-2 border-primary/20 pl-3 py-1 bg-muted/30 rounded-r-md">
                                    <p>Base Price: <span className="font-medium text-foreground">{formatPrice(baseAmount)}</span></p>
                                    <p>GST (18%): <span className="font-medium text-foreground">{formatPrice(gstAmount)}</span></p>
                                    <p className="text-[10px] uppercase tracking-wider font-bold mt-1 text-primary/70">Inclusive of all taxes</p>
                                </div>
                            </div>

                            {/* Wholesale Price Info */}
                            {product.b2b_price && !useWholesale && (
                                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                                    <p className="text-xs text-amber-800">
                                        Buy {minOrderQty} or more to get the wholesale price of <span className="font-bold">{formatPrice(Number(product.b2b_price))}</span>
                                    </p>
                                </div>
                            )}

                            {/* Quantity */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select Quantity</label>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center border rounded-lg bg-card">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-10 w-10 rounded-none rounded-l-lg"
                                            onClick={() => setQuantity((q) => Math.max(minOrderQty, q - 1))}
                                        >
                                            <Minus className="h-4 w-4" />
                                        </Button>
                                        <span className="w-12 text-center text-lg font-bold border-x h-10 flex items-center justify-center">
                                            {displayQty}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-10 w-10 rounded-none rounded-r-lg"
                                            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={cn(
                                            "text-sm font-semibold",
                                            remainingStock < 10 ? "text-destructive" : "text-green-600"
                                        )}>
                                            {remainingStock} units left
                                        </span>
                                        <span className="text-[10px] text-muted-foreground uppercase">Stock Status</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4">
                                <Button size="lg" className="flex-1" onClick={handleAddToCart}>
                                    <ShoppingCart className="h-5 w-5 mr-2" />
                                    Add to Cart
                                </Button>
                                <Button size="lg" variant="secondary" className="flex-1" onClick={handleBuyNow}>
                                    Buy Now
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className={inWishlist ? 'text-primary border-primary' : ''}
                                    onClick={handleToggleWishlist}
                                >
                                    <Heart className={`h-5 w-5 ${inWishlist ? 'fill-current' : ''}`} />
                                </Button>
                            </div>

                            {/* Features */}
                            <div className="grid grid-cols-3 gap-4 pt-6 border-t">
                                <div className="flex items-center gap-2">
                                    <Truck className="h-5 w-5 text-muted-foreground" />
                                    <span className="text-sm">Free Shipping</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-muted-foreground" />
                                    <span className="text-sm">100% Genuine</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <RotateCcw className="h-5 w-5 text-muted-foreground" />
                                    <span className="text-sm">Easy Returns</span>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="pt-6 border-t">
                                <h2 className="text-lg font-semibold mb-3">Description</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    {product.description}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Related Products */}
                    {relatedProducts.length > 0 && (
                        <div className="mt-16">
                            <h2 className="text-2xl font-bold mb-6">Related Products</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {relatedProducts.map((relProduct) => {
                                    const relDiscount = getDiscountPercentage(relProduct.mrp, relProduct.selling_price);
                                    return (
                                        <Card key={relProduct.id} className="group overflow-hidden hover:shadow-lg transition-all">
                                            <Link href={`/products/${relProduct.slug}`}>
                                                <div className="relative aspect-square overflow-hidden bg-muted">
                                                    <Image
                                                        src={relProduct.images[0]?.image_url}
                                                        alt={relProduct.name}
                                                        fill
                                                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                    />
                                                    {relDiscount > 0 && (
                                                        <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded">
                                                            {relDiscount}% OFF
                                                        </span>
                                                    )}
                                                </div>
                                                <CardContent className="p-4">
                                                    <h3 className="font-medium truncate">{relProduct.name}</h3>
                                                    <p className="text-lg font-bold text-primary mt-1">
                                                        {formatPrice(relProduct.selling_price)}
                                                    </p>
                                                </CardContent>
                                            </Link>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
