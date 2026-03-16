'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingCart, Trash2, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useWishlistStore } from '@/store/wishlist-store';
import { useCartStore } from '@/store/cart-store';
import { useToast } from '@/hooks/use-toast';
import { formatPrice, getDiscountPercentage } from '@/lib/utils';

export default function WishlistPage() {
    const { items, removeItem, clearWishlist } = useWishlistStore();
    const { addItem: addToCart } = useCartStore();
    const { toast } = useToast();

    const handleMoveToCart = (product: any) => {
        addToCart(product, 1);
        removeItem(product.id);
        toast({
            title: 'Moved to Cart',
            description: `${product.name} moved to your cart`,
        });
    };

    if (items.length === 0) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h1 className="text-2xl font-bold">Your Wishlist is Empty</h1>
                        <p className="text-muted-foreground mt-2">Save products you love for later!</p>
                        <Link href="/products">
                            <Button className="mt-6">
                                Browse Products <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 py-8">
                <div className="container">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold">My Wishlist</h1>
                            <p className="text-muted-foreground mt-1">{items.length} items saved</p>
                        </div>
                        <Button variant="outline" onClick={clearWishlist}>
                            Clear All
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {items.map((product) => {
                            const discount = getDiscountPercentage(product.mrp, product.selling_price);
                            const primaryImage = product.images[0]?.image_url;

                            return (
                                <Card key={product.id} className="group overflow-hidden hover:shadow-lg transition-all">
                                    <div className="relative aspect-square overflow-hidden bg-muted">
                                        <Link href={`/products/${product.slug}`}>
                                            <Image
                                                src={primaryImage}
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
                                            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-red-50 transition-colors"
                                            onClick={() => removeItem(product.id)}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </button>
                                    </div>

                                    <CardContent className="p-4">
                                        <p className="text-xs text-muted-foreground mb-1">{product.brand_name}</p>
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
                                            onClick={() => handleMoveToCart(product)}
                                        >
                                            <ShoppingCart className="h-4 w-4 mr-2" />
                                            Move to Cart
                                        </Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
