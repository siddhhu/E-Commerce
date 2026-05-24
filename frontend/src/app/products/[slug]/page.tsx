'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingCart, Minus, Plus, ArrowLeft, Truck, Shield, RotateCcw, Loader2, Share2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PromoBanner } from '@/components/layout/PromoBanner';
import { Star } from 'lucide-react';
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
    const [variants, setVariants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const { addItem: addToCart } = useCartStore();
    const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore();
    const [imgError, setImgError] = useState(false);
    const [activeImage, setActiveImage] = useState<string | null>(null);

    useEffect(() => {
        async function fetchProduct() {
            if (!params.slug) return;
            setLoading(true);
            try {
                const data = await productsApi.getBySlug(params.slug as string);
                setProduct(data);
                
                try {
                    const variantsData = await productsApi.getVariants(params.slug as string);
                    setVariants(variantsData);
                } catch (vErr) {
                    console.error('Failed to fetch variants:', vErr);
                }
                
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
        setActiveImage(null); // Reset image when switching variants
    }, [product]);

    const handleVariantSelect = (v: any) => {
        setProduct(v);
        // Shallow routing to update URL without reloading
        window.history.replaceState(null, '', `/products/${v.slug}`);
    };

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
        : (activeImage || product.image_url || product.images?.find((img) => img.is_primary)?.image_url || product.images?.[0]?.image_url || '/placeholder.jpg');
    const inWishlist = isInWishlist(product.id);

    const isOutOfStock = product.stock_quantity <= 0;
    const minOrderQty = Math.max(1, product.min_order_quantity || 1);
    const maxQty = Math.max(minOrderQty, product.stock_quantity || minOrderQty);
    
    // Effective quantity shown to the user
    const displayQty = isOutOfStock ? 0 : Math.min(Math.max(quantity, minOrderQty), maxQty);
    
    // Use wholesale price if quantity meets minimum
    const useWholesale = Boolean(product.b2b_price) && displayQty >= minOrderQty;
    const unitPrice = useWholesale ? Number(product.b2b_price) : Number(product.selling_price);
    
    // Total price based on quantity (if out of stock, default to single unit price for display)
    const totalPrice = unitPrice * (isOutOfStock ? 1 : displayQty);
    
    // GST Calculation based on product specific GST percentage
    const gstRate = product.gst_percentage ?? 18;
    const baseAmount = totalPrice / (1 + gstRate / 100);
    const gstAmount = totalPrice - baseAmount;
    
    const remainingStock = isOutOfStock ? 0 : Math.max(0, Number(product.stock_quantity) - displayQty);

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
        gst_percentage: p.gst_percentage,
        min_order_quantity: p.min_order_quantity,
        unit: p.unit,
        is_active: p.is_active,
        is_featured: p.is_featured,
        category_id: p.category_id || '',
        category_name: '', // We don't have this in APIProduct but it's okay for store
        brand_id: p.brand_id || '',
        brand_name: '',
        image_url:
            p.image_url ||
            p.images?.find((img) => img.is_primary)?.image_url ||
            p.images?.[0]?.image_url,
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

    const handleShare = async () => {
        if (!product) return;
        
        const shareData = {
            title: product.name,
            text: product.short_description || `Check out ${product.name} on Pranjay`,
            url: window.location.href,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                toast({
                    title: 'Link Copied',
                    description: 'Product link copied to clipboard',
                });
            }
        } catch (err) {
            console.error('Error sharing:', err);
        }
    };

    // Related products (same category)
    const relatedProducts = [] as any[]; // Simplified for now since we don't have easy fetch for this yet

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <PromoBanner />

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
                            
                            {/* Thumbnails below main image */}
                            <div className="flex gap-4 overflow-x-auto pb-2">
                                {product.images?.map((img, i) => {
                                    const isSelected = activeImage === img.image_url || (!activeImage && i === 0);
                                    return (
                                        <div 
                                            key={img.id} 
                                            onClick={() => setActiveImage(img.image_url)}
                                            className={cn(
                                                "relative w-20 h-20 rounded-lg overflow-hidden border-2 flex-shrink-0 cursor-pointer transition-all",
                                                isSelected ? "border-primary scale-105" : "border-transparent opacity-70 hover:opacity-100"
                                            )}
                                        >
                                            <Image
                                                src={img.image_url}
                                                alt={img.alt_text || product.name}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Product Details */}
                        <div className="space-y-6">
                            <div>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center flex-wrap gap-2">
                                        <h1 className="text-3xl font-bold">{product.name}</h1>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground hover:text-foreground shrink-0 -mt-1"
                                        onClick={handleShare}
                                        title="Share Product"
                                    >
                                        <Share2 className="h-5 w-5" />
                                    </Button>
                                </div>
                                {/* Stars */}
                                <div className="flex items-center gap-1 mt-2">
                                    <div className="flex">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className={cn("h-4 w-4", i < 4 ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted")} />
                                        ))}
                                    </div>
                                    <span className="text-sm font-medium ml-1">12 reviews</span>
                                </div>
                                
                                {/* Bullet points */}
                                <div className="mt-4 space-y-2 text-sm">
                                    <p>🌿 <span className="font-semibold">Botanical Extracts:</span> Sandalwood, Licorice, Jojoba.</p>
                                    <p>💧 <span className="font-semibold">Deeply Moisturizing:</span> Acts as a moisturizing treatment.</p>
                                    <p>✨ <span className="font-semibold">Smooth & Soft Texture:</span> Enhances skin texture.</p>
                                    <p>💖 <span className="font-semibold">Shades for Every Occasion:</span> Adds glamour.</p>
                                </div>
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
                                    <p>GST ({gstRate}%): <span className="font-medium text-foreground">{formatPrice(gstAmount)}</span></p>
                                    <p className="text-[10px] uppercase tracking-wider font-bold mt-1 text-primary/70">Inclusive of all taxes</p>
                                </div>
                            </div>

                            {/* Wholesale Price Info */}
                            {product.b2b_price && !useWholesale && (
                                <div className="p-3 bg-[#fff8e1] rounded-lg inline-flex items-center gap-2">
                                    <span className="text-lg">⭐</span>
                                    <p className="text-sm text-slate-800">
                                        Buy {minOrderQty} or more to get the wholesale price of <span className="font-bold">{formatPrice(Number(product.b2b_price))}</span>
                                    </p>
                                </div>
                            )}

                            {/* Variants */}
                            {variants.length > 1 && (
                                <div className="space-y-3 py-2">
                                    <h3 className="text-sm font-semibold">Select Shade:</h3>
                                    <div className="flex flex-wrap gap-3">
                                        {variants.map(v => {
                                            const color = v.attributes?.color || '#e0a98f'; // fallback color
                                            const label = color || v.name;
                                            
                                            const isHexOrBasicColor = color ? /^(#[0-9A-F]{3,6}|[a-zA-Z]+)$/i.test(color) : false;
                                            const colorStyle = isHexOrBasicColor ? { backgroundColor: color.toLowerCase() } : {};
                                            
                                            return (
                                                <div key={v.id} onClick={() => handleVariantSelect(v)}>
                                                    <div 
                                                        className={cn(
                                                            "w-8 h-8 rounded-full border-2 shadow-sm transition-all cursor-pointer",
                                                            v.id === product.id ? "border-slate-800 scale-110" : "border-transparent hover:scale-105"
                                                        )}
                                                        style={colorStyle}
                                                        title={label}
                                                    ></div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <p className="text-sm font-medium mt-2">{((product.attributes as any)?.color) || 'Dawn Magic'}</p>
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
                                            disabled={isOutOfStock}
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
                                            disabled={isOutOfStock}
                                            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={cn(
                                            "text-sm font-semibold",
                                            isOutOfStock ? "text-destructive" : remainingStock < 6 ? "text-amber-600" : "text-green-600"
                                        )}>
                                            {isOutOfStock ? "Out of Stock" : remainingStock < 6 ? "Only a few stock left, hurry up!" : "In Stock"}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground uppercase">Stock Status</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                {isOutOfStock ? (
                                    <Button 
                                        size="lg" 
                                        className="flex-1 bg-[#d81b60] hover:bg-[#c2185b] text-white" 
                                        disabled={true}
                                    >
                                        Notify Me When In Stock
                                    </Button>
                                ) : (
                                    <Button 
                                        size="lg" 
                                        className="flex-1 bg-[#d81b60] hover:bg-[#c2185b] text-white" 
                                        onClick={handleAddToCart}
                                    >
                                        <ShoppingCart className="h-5 w-5 mr-2" />
                                        Add to Cart
                                    </Button>
                                )}
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className={cn("bg-[#f0f0f0] border-0 hover:bg-[#e0e0e0] px-4", inWishlist ? 'text-[#d81b60]' : 'text-slate-500')}
                                    onClick={handleToggleWishlist}
                                >
                                    <Heart className={`h-5 w-5 ${inWishlist ? 'fill-current' : ''}`} />
                                </Button>
                            </div>

                            {/* Features */}
                            <div className="flex flex-wrap items-center gap-6 pt-6 font-bold text-sm text-slate-800">
                                <div className="flex items-center gap-2">
                                    <Truck className="h-5 w-5" />
                                    <span>Free Shipping</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Shield className="h-5 w-5" />
                                    <span>100% Genuine</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <RotateCcw className="h-5 w-5" />
                                    <span>Easy Returns</span>
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
