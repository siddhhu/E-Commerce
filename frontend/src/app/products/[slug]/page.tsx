'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingCart, Minus, Plus, ArrowLeft, Truck, Shield, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useToast } from '@/hooks/use-toast';
import { getProductBySlug, dummyProducts, Product } from '@/lib/dummy-data';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { formatPrice, getDiscountPercentage } from '@/lib/utils';

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [quantity, setQuantity] = useState(1);

    const product = getProductBySlug(params.slug as string);
    const { addItem: addToCart } = useCartStore();
    const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore();

    if (!product) {
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
    const primaryImage = product.images[0]?.image_url;
    const inWishlist = isInWishlist(product.id);

    const handleAddToCart = () => {
        addToCart(product, quantity);
        toast({
            title: 'Added to Cart',
            description: `${quantity}x ${product.name} added to your cart`,
        });
    };

    const handleBuyNow = () => {
        addToCart(product, quantity);
        router.push('/cart');
    };

    const handleToggleWishlist = () => {
        if (inWishlist) {
            removeFromWishlist(product.id);
            toast({ title: 'Removed from Wishlist' });
        } else {
            addToWishlist(product);
            toast({ title: 'Added to Wishlist' });
        }
    };

    // Related products (same category)
    const relatedProducts = dummyProducts
        .filter(p => p.category_id === product.category_id && p.id !== product.id)
        .slice(0, 4);

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
                                <p className="text-sm text-muted-foreground mb-1">{product.brand_name}</p>
                                <h1 className="text-3xl font-bold">{product.name}</h1>
                                <p className="text-muted-foreground mt-2">{product.short_description}</p>
                            </div>

                            {/* Pricing */}
                            <div className="flex items-center gap-4">
                                <span className="text-4xl font-bold text-primary">
                                    {formatPrice(product.selling_price)}
                                </span>
                                {discount > 0 && (
                                    <>
                                        <span className="text-xl text-muted-foreground line-through">
                                            {formatPrice(product.mrp)}
                                        </span>
                                        <span className="bg-green-100 text-green-700 text-sm font-medium px-2 py-1 rounded">
                                            Save {formatPrice(product.mrp - product.selling_price)}
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* B2B Price */}
                            {product.b2b_price && (
                                <div className="bg-accent/50 border border-accent rounded-lg p-4">
                                    <p className="text-sm font-medium">B2B Wholesale Price</p>
                                    <p className="text-2xl font-bold text-primary">{formatPrice(product.b2b_price)}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Min. order: {product.min_order_quantity} {product.unit}
                                    </p>
                                </div>
                            )}

                            {/* Quantity */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Quantity</label>
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    >
                                        <Minus className="h-4 w-4" />
                                    </Button>
                                    <span className="w-12 text-center text-lg font-medium">{quantity}</span>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                    <span className="text-sm text-muted-foreground">
                                        {product.stock_quantity} in stock
                                    </span>
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
