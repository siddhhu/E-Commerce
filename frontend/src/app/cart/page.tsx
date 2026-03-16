'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useCartStore } from '@/store/cart-store';
import { formatPrice } from '@/lib/utils';

export default function CartPage() {
    const router = useRouter();
    const { items, removeItem, updateQuantity, getSubtotal, getTax, getTotal, clearCart } = useCartStore();

    if (items.length === 0) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h1 className="text-2xl font-bold">Your Cart is Empty</h1>
                        <p className="text-muted-foreground mt-2">Add some products to get started!</p>
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
                    <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Cart Items */}
                        <div className="lg:col-span-2 space-y-4">
                            {items.map((item) => (
                                <Card key={item.id} className="overflow-hidden">
                                    <div className="flex gap-4 p-4">
                                        {/* Product Image */}
                                        <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted shrink-0">
                                            <Image
                                                src={item.product.images[0]?.image_url}
                                                alt={item.product.name}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>

                                        {/* Product Details */}
                                        <div className="flex-1 min-w-0">
                                            <Link href={`/products/${item.product.slug}`}>
                                                <h3 className="font-medium hover:text-primary transition-colors">
                                                    {item.product.name}
                                                </h3>
                                            </Link>
                                            <p className="text-sm text-muted-foreground">{item.product.brand_name}</p>
                                            <p className="text-lg font-bold text-primary mt-1">
                                                {formatPrice(item.product.selling_price)}
                                            </p>
                                        </div>

                                        {/* Quantity Controls */}
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <span className="w-8 text-center font-medium">{item.quantity}</span>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => removeItem(item.product.id)}
                                            >
                                                <Trash2 className="h-4 w-4 mr-1" />
                                                Remove
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Item Total */}
                                    <div className="bg-muted/50 px-4 py-2 flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Item Total</span>
                                        <span className="font-semibold">
                                            {formatPrice(item.product.selling_price * item.quantity)}
                                        </span>
                                    </div>
                                </Card>
                            ))}

                            <Button variant="outline" onClick={clearCart}>
                                Clear Cart
                            </Button>
                        </div>

                        {/* Order Summary */}
                        <div>
                            <Card className="sticky top-24">
                                <CardHeader>
                                    <CardTitle>Order Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Subtotal ({items.length} items)</span>
                                        <span>{formatPrice(getSubtotal())}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">GST (18%)</span>
                                        <span>{formatPrice(getTax())}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Shipping</span>
                                        <span className="text-green-600">Free</span>
                                    </div>
                                    <div className="border-t pt-4 flex justify-between text-lg font-bold">
                                        <span>Total</span>
                                        <span className="text-primary">{formatPrice(getTotal())}</span>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button
                                        className="w-full"
                                        size="lg"
                                        onClick={() => router.push('/checkout')}
                                    >
                                        Proceed to Checkout
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
