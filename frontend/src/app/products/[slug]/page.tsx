'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingCart, Minus, Plus, Truck, Shield, Loader2, Share2, Check, ChevronLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PromoBanner } from '@/components/layout/PromoBanner';

import { useToast } from '@/hooks/use-toast';
import { dummyProducts, Product } from '@/lib/dummy-data';
import { productsApi, Product as APIProduct } from '@/lib/api';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { cn, formatPrice, getDiscountPercentage } from '@/lib/utils';

// ── Variant type detection ──────────────────────────────────────────────────
// Priority order: color/shade → size/weight/volume → name fallback
type VariantMode = 'shade' | 'size' | 'name';

function detectVariantMode(variants: any[]): VariantMode {
    if (!variants || variants.length < 2) return 'name';
    // Sample a few variants' attributes
    const samples = variants.slice(0, Math.min(5, variants.length));
    for (const v of samples) {
        const a = (v.attributes as Record<string, unknown>) || {};
        // Check for color/shade attributes
        if (a.color_hex || a.color_name || a.color || a.shade) return 'shade';
    }
    for (const v of samples) {
        const a = (v.attributes as Record<string, unknown>) || {};
        // Check for size/weight/volume attributes
        if (a.weight || a.size || a.volume || a.volume_ml || a.capacity || a.ml || a.grams || a.g) return 'size';
        // Check if unit field hints at a size variant
        if (v.unit && ['ml', 'g', 'kg', 'l', 'oz'].includes(String(v.unit).toLowerCase())) return 'size';
    }
    // If names differ by a known pattern (e.g. "50g", "100g", "200ml"), treat as size
    const namePattern = /(\d+\s*(ml|g|kg|l|oz|gm|litre|liter|pcs|pack))/i;
    const variantsWithSizeInName = samples.filter(v => namePattern.test(v.name || ''));
    if (variantsWithSizeInName.length >= Math.min(2, samples.length)) return 'size';
    return 'name';
}

// Get a display label for a size/name variant
function getVariantLabel(v: any): string {
    const a = (v.attributes as Record<string, any>) || {};
    // Try explicit size attributes first
    if (a.size) return String(a.size);
    if (a.weight && a.unit) return `${a.weight} ${a.unit}`;
    if (a.weight) return String(a.weight);
    if (a.volume_ml) return `${a.volume_ml}ml`;
    if (a.volume && a.unit) return `${a.volume} ${a.unit}`;
    if (a.volume) return String(a.volume);
    if (a.capacity) return String(a.capacity);
    if (a.ml) return `${a.ml}ml`;
    if (a.g) return `${a.g}g`;
    // Try to extract size from product name
    const sizeMatch = (v.name || '').match(/(\d+\s*(ml|g|kg|l|oz|gm|litre|liter|pcs|pack))/i);
    if (sizeMatch) return sizeMatch[0];
    // Fallback to short name
    const name: string = v.name || '';
    return name.length > 18 ? name.substring(0, 16) + '…' : name;
}

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
                // Fetch product and variants in parallel to reduce load time
                const [productData, variantsData] = await Promise.all([
                    productsApi.getBySlug(params.slug as string),
                    productsApi.getVariants(params.slug as string).catch((err) => {
                        console.error('Failed to fetch variants:', err);
                        return [];
                    })
                ]);
                
                setProduct(productData);
                setVariants(variantsData);
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
        setActiveImage(null);
    }, [product]);

    const handleVariantSelect = (v: any) => {
        setProduct(v);
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
                        <p className="text-muted-foreground mt-2">The product you&apos;re looking for doesn&apos;t exist.</p>
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

    const displayQty = isOutOfStock ? 0 : Math.min(Math.max(quantity, minOrderQty), maxQty);
    const useWholesale = Boolean(product.b2b_price) && displayQty >= minOrderQty;
    const unitPrice = useWholesale ? Number(product.b2b_price) : Number(product.selling_price);
    const totalPrice = unitPrice * (isOutOfStock ? 1 : displayQty);

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
        category_name: '',
        brand_id: p.brand_id || '',
        brand_name: '',
        image_url: p.image_url || p.images?.find((img) => img.is_primary)?.image_url || p.images?.[0]?.image_url,
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
            description: `${displayQty}× ${product.name} added to your cart`,
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
        try {
            if (navigator.share) {
                await navigator.share({ title: product.name, text: product.short_description || `Check out ${product.name}`, url: window.location.href });
            } else {
                await navigator.clipboard.writeText(window.location.href);
                toast({ title: 'Link Copied', description: 'Product link copied to clipboard' });
            }
        } catch { /* user cancelled */ }
    };

    // ── Variant UI logic ──────────────────────────────────────────────────────
    const variantMode = detectVariantMode(variants);

    const renderVariants = () => {
        if (variants.length < 2) return null;

        if (variantMode === 'shade') {
            // Get currently selected variant's color name
            const currentColorName = (product.attributes as any)?.color_name
                || (product.attributes as any)?.shade
                || (product.attributes as any)?.color
                || product.name;

            return (
                <div className="space-y-3 py-1">
                    <p className="text-sm font-semibold text-slate-800">
                        Select Shade: <span className="font-bold text-primary">{currentColorName}</span>
                    </p>
                    <div className="flex flex-wrap gap-3">
                        {variants.map(v => {
                            const a = (v.attributes as any) || {};
                            const colorHex = a.color_hex || a.color;
                            const colorName = a.color_name || a.shade || a.color || v.name;
                            const isSelected = v.id === product.id;
                            const hasValidHex = colorHex && /^(#[0-9A-Fa-f]{3,6}|[a-zA-Z]+)$/.test(colorHex);
                            const vImage = v.image_url || v.images?.find((img: any) => img.is_primary)?.image_url || v.images?.[0]?.image_url;

                            return (
                                <button
                                    key={v.id}
                                    onClick={() => handleVariantSelect(v)}
                                    title={colorName}
                                    className={cn(
                                        "relative w-10 h-10 rounded-full border-2 shadow-sm transition-all cursor-pointer overflow-hidden focus:outline-none",
                                        isSelected
                                            ? "border-primary ring-2 ring-primary ring-offset-2 scale-110"
                                            : "border-slate-200 hover:scale-105 hover:border-slate-400"
                                    )}
                                    style={hasValidHex ? { backgroundColor: colorHex } : {}}
                                >
                                    {!hasValidHex && vImage && (
                                        <Image src={vImage} alt={colorName} fill className="object-cover" />
                                    )}
                                    {!hasValidHex && !vImage && (
                                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-600 bg-slate-100 text-center leading-tight px-0.5">
                                            {colorName?.substring(0, 4)}
                                        </span>
                                    )}
                                    {isSelected && (
                                        <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                                            <Check className="h-3 w-3 text-white drop-shadow" />
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            );
        }

        if (variantMode === 'size') {
            const currentLabel = getVariantLabel(product);
            return (
                <div className="space-y-3 py-1">
                    <p className="text-sm font-semibold text-slate-800">
                        Select Size: <span className="font-bold text-primary">{currentLabel}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {variants.map(v => {
                            const label = getVariantLabel(v);
                            const isSelected = v.id === product.id;
                            const oos = v.stock_quantity <= 0;

                            return (
                                <button
                                    key={v.id}
                                    onClick={() => !oos && handleVariantSelect(v)}
                                    disabled={oos}
                                    className={cn(
                                        "relative px-4 py-2 rounded-full border text-sm font-semibold transition-all focus:outline-none",
                                        isSelected
                                            ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                                            : oos
                                            ? "border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed line-through"
                                            : "border-slate-300 text-slate-700 bg-white hover:border-primary hover:text-primary"
                                    )}
                                >
                                    {label}
                                    {isSelected && (
                                        <span className="absolute -top-1.5 -right-1.5 bg-primary rounded-full w-4 h-4 flex items-center justify-center">
                                            <Check className="h-2.5 w-2.5 text-white" />
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            );
        }

        // Fallback: name pills
        return (
            <div className="space-y-3 py-1">
                <p className="text-sm font-semibold text-slate-800">Select Variant:</p>
                <div className="flex flex-wrap gap-2">
                    {variants.map(v => {
                        const isSelected = v.id === product.id;
                        const oos = v.stock_quantity <= 0;
                        const label = v.name?.length > 22 ? v.name.substring(0, 20) + '…' : v.name;

                        return (
                            <button
                                key={v.id}
                                onClick={() => !oos && handleVariantSelect(v)}
                                disabled={oos}
                                className={cn(
                                    "px-4 py-2 rounded-full border text-sm font-medium transition-all focus:outline-none",
                                    isSelected
                                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                                        : oos
                                        ? "border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed line-through"
                                        : "border-slate-300 text-slate-700 hover:border-primary hover:text-primary"
                                )}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <PromoBanner />

            <main className="flex-1 pb-24 md:pb-8">
                <div className="container py-4 md:py-8">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground mb-4 md:mb-8 overflow-x-auto whitespace-nowrap">
                        <Link href="/" className="hover:text-primary shrink-0">Home</Link>
                        <span>/</span>
                        <Link href="/products" className="hover:text-primary shrink-0">Products</Link>
                        <span>/</span>
                        <span className="text-foreground truncate max-w-[180px] md:max-w-none">{product.name}</span>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-6 lg:gap-12">
                        {/* ── Product Images ─────────────────────────────────── */}
                        <div className="space-y-3">
                            {/* Main Image */}
                            <div className="relative aspect-square rounded-xl md:rounded-2xl overflow-hidden bg-muted">
                                <Image
                                    src={primaryImage}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                    priority
                                    onError={() => setImgError(true)}
                                />
                                {discount > 0 && (
                                    <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-md shadow">
                                        {discount}% OFF
                                    </span>
                                )}
                                {/* Share button on image (mobile) */}
                                <button
                                    onClick={handleShare}
                                    className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm rounded-full p-2 shadow hover:bg-white transition-all"
                                >
                                    <Share2 className="h-4 w-4 text-slate-700" />
                                </button>
                            </div>

                            {/* Thumbnails */}
                            {product.images && product.images.length > 1 && (
                                <div className="flex gap-2.5 overflow-x-auto pb-1">
                                    {product.images.map((img, i) => {
                                        const isSelected = activeImage === img.image_url || (!activeImage && i === 0);
                                        return (
                                            <button
                                                key={img.id}
                                                onClick={() => setActiveImage(img.image_url)}
                                                className={cn(
                                                    "relative w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all",
                                                    isSelected ? "border-primary scale-105 shadow-md" : "border-transparent opacity-60 hover:opacity-100"
                                                )}
                                            >
                                                <Image src={img.image_url} alt={img.alt_text || product.name} fill className="object-cover" />
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* ── Product Details ────────────────────────────────── */}
                        <div className="space-y-5">
                            {/* Title row */}
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">{product.name}</h1>
                                {product.short_description && (
                                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{product.short_description}</p>
                                )}
                            </div>

                            {/* Pricing */}
                            <div className="space-y-1.5">
                                <div className="flex items-end gap-3 flex-wrap">
                                    <span className="text-4xl md:text-5xl font-extrabold text-primary leading-none">
                                        {formatPrice(totalPrice)}
                                    </span>
                                    {discount > 0 && (
                                        <div className="flex flex-col mb-0.5">
                                            <span className="text-lg text-muted-foreground line-through">
                                                {formatPrice(product.mrp * (isOutOfStock ? 1 : displayQty))}
                                            </span>
                                            <span className="text-sm font-semibold text-green-600">
                                                Save {formatPrice((product.mrp - unitPrice) * (isOutOfStock ? 1 : displayQty))}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 font-medium">
                                        ✓ Inclusive of all taxes
                                    </span>
                                </div>
                            </div>

                            {/* Sold By */}
                            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                                <span>
                                    <span className="font-semibold text-slate-700">Sold by:</span>{' '}
                                    {product.seller_name || 'Pranjay'}
                                </span>
                                {product.seller_gst_number && (
                                    <span className="text-slate-400">
                                        GSTIN: <span className="font-mono font-medium text-slate-600">{product.seller_gst_number}</span>
                                    </span>
                                )}
                            </div>

                            {/* Wholesale nudge */}
                            {product.b2b_price && !useWholesale && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
                                    <span className="text-xl">⭐</span>
                                    <p className="text-sm text-amber-900">
                                        Buy <strong>{minOrderQty}+</strong> to unlock wholesale price of{' '}
                                        <strong>{formatPrice(Number(product.b2b_price))}</strong>
                                    </p>
                                </div>
                            )}

                            {/* ── Smart Variant Selector ─────────────────────── */}
                            {renderVariants()}

                            {/* ── Quantity Selector ──────────────────────────── */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-800">Quantity</label>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center border-2 border-slate-200 rounded-xl overflow-hidden bg-white">
                                        <button
                                            className="h-11 w-11 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                                            disabled={isOutOfStock || displayQty <= minOrderQty}
                                            onClick={() => setQuantity((q) => Math.max(minOrderQty, q - 1))}
                                        >
                                            <Minus className="h-4 w-4" />
                                        </button>
                                        <span className="w-12 text-center text-lg font-bold text-slate-900 border-x-2 border-slate-200 h-11 flex items-center justify-center">
                                            {displayQty}
                                        </span>
                                        <button
                                            className="h-11 w-11 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                                            disabled={isOutOfStock || displayQty >= maxQty}
                                            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={cn(
                                            "text-sm font-semibold",
                                            isOutOfStock ? "text-destructive" : remainingStock < 6 ? "text-amber-600" : "text-green-600"
                                        )}>
                                            {isOutOfStock ? "Out of Stock" : remainingStock < 6 ? `Only ${remainingStock} left!` : "In Stock"}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Stock Status</span>
                                    </div>
                                </div>
                            </div>

                            {/* ── Action Buttons (Desktop) ───────────────────── */}
                            <div className="hidden md:flex gap-4">
                                {isOutOfStock ? (
                                    <Button size="lg" className="flex-1 h-14 text-lg bg-slate-400 cursor-not-allowed font-semibold rounded-xl" disabled>
                                        Out of Stock
                                    </Button>
                                ) : (
                                    <>
                                        <Button
                                            size="lg"
                                            className="flex-1 h-14 text-lg font-semibold rounded-xl bg-[#d81b60] hover:bg-[#c2185b] text-white shadow-md hover:shadow-lg transition-all"
                                            onClick={handleAddToCart}
                                        >
                                            <ShoppingCart className="h-6 w-6 mr-2" />
                                            Add to Cart
                                        </Button>
                                        <Button
                                            size="lg"
                                            variant="outline"
                                            className={cn("h-14 w-14 p-0 rounded-xl border-2 transition-all flex items-center justify-center shrink-0", inWishlist ? 'border-[#d81b60] text-[#d81b60] bg-pink-50' : 'border-slate-300 text-slate-500 hover:border-[#d81b60] hover:text-[#d81b60]')}
                                            onClick={handleToggleWishlist}
                                        >
                                            <Heart className={cn("h-6 w-6", inWishlist ? 'fill-current' : '')} />
                                        </Button>
                                    </>
                                )}
                            </div>

                            {/* Trust badges */}
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-2 border-t border-slate-100">
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                    <Truck className="h-4 w-4 text-primary" />
                                    <span>Free Shipping</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                    <Shield className="h-4 w-4 text-primary" />
                                    <span>100% Genuine</span>
                                </div>
                            </div>

                            {/* Description */}
                            {product.description && (
                                <div className="pt-2 border-t border-slate-100">
                                    <h2 className="text-base font-semibold mb-2 text-slate-900">Description</h2>
                                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                                        {product.description}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* ── Sticky bottom bar (Mobile only) ────────────────────────────── */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] safe-area-inset">
                <div className="flex items-center gap-2 p-3 px-4">
                    <button
                        onClick={handleToggleWishlist}
                        className={cn(
                            "flex-shrink-0 h-12 w-12 rounded-xl border-2 flex items-center justify-center transition-all",
                            inWishlist ? "border-[#d81b60] text-[#d81b60] bg-pink-50" : "border-slate-200 text-slate-500"
                        )}
                    >
                        <Heart className={cn("h-5 w-5", inWishlist ? "fill-current" : "")} />
                    </button>
                    {isOutOfStock ? (
                        <button disabled className="flex-1 h-12 rounded-xl bg-slate-300 text-slate-500 font-bold text-base cursor-not-allowed">
                            Out of Stock
                        </button>
                    ) : (
                        <button
                            onClick={handleAddToCart}
                            className="flex-1 h-12 rounded-xl bg-[#d81b60] hover:bg-[#c2185b] text-white font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
                        >
                            <ShoppingCart className="h-5 w-5" />
                            Add to Cart • {formatPrice(totalPrice)}
                        </button>
                    )}
                </div>
            </div>

            <Footer />
        </div>
    );
}
