'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useCartStore } from '@/store/cart-store';
import { formatPrice, resolveImageUrl } from '@/lib/utils';
import { promoCodesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

export default function CartPage() {
    const router = useRouter();
    const {
        items,
        removeItem,
        updateQuantity,
        getSubtotal,
        getDiscount,
        getDeliveryFee,
        getFreeDeliveryShortfall,
        getTax,
        getTotal,
        clearCart,
        promo_code,
        setPromo,
        clearPromo,
    } = useCartStore();

    const { user } = useAuthStore();
    const role = (user?.role || '').toString().toLowerCase();
    const isAdminOrSeller = user && (
        role === 'admin' || role === 'super_admin' ||
        (user.seller_status === 'approved' && user.user_type === 'seller')
    );

    const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

    const [promoInput, setPromoInput] = useState('');
    const [isApplyingPromo, setIsApplyingPromo] = useState(false);
    const [promoError, setPromoError] = useState<string | null>(null);

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
                    <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">Shopping Cart</h1>

                    <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
                        {/* Cart Items */}
                        <div className="lg:col-span-2 space-y-3">
                            {items.map((item) => (
                                <Card key={item.id} className="overflow-hidden">
                                    <div className="flex gap-3 p-3 md:p-4">
                                        {/* Product Image */}
                                        <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden bg-muted shrink-0">
                                            {(() => {
                                                const imgError = Boolean(imgErrors[item.product.id]);
                                                const imageUrl =
                                                    imgError
                                                        ? '/placeholder.jpg'
                                                        : (item.product.image_url ||
                                                            item.product.images?.find((img) => img.is_primary)?.image_url ||
                                                            item.product.images?.[0]?.image_url ||
                                                            '/placeholder.jpg');

                                                return (
                                            <img
                                                src={resolveImageUrl(imageUrl)}
                                                alt={item.product.name}
                                                className="h-full w-full object-cover"
                                                onError={() =>
                                                    setImgErrors((prev) => ({
                                                        ...prev,
                                                        [item.product.id]: true,
                                                    }))
                                                }
                                            />
                                                );
                                            })()}
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
                                    {/* Promo Code */}
                                    <div className="border rounded-lg p-3 bg-white">
                                        <div className="font-semibold mb-2">Promo Code</div>
                                        {promo_code ? (
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="font-mono text-sm">{promo_code}</div>
                                                    {getDiscount() > 0 ? (
                                                        <div className="text-xs text-green-600">Applied</div>
                                                    ) : (
                                                        <div className="max-w-[220px] text-xs text-amber-700">
                                                            Add more quantity or products to use this promo.
                                                        </div>
                                                    )}
                                                </div>
                                                <Button variant="outline" size="sm" onClick={clearPromo}>
                                                    Remove
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="flex gap-2">
                                                    <input
                                                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                                        placeholder="Enter promo code"
                                                        value={promoInput}
                                                        onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                                                    />
                                                    <Button
                                                        disabled={isApplyingPromo || !promoInput.trim()}
                                                        onClick={async () => {
                                                            setIsApplyingPromo(true);
                                                            setPromoError(null);
                                                            try {
                                                                const res = await promoCodesApi.validate(promoInput.trim(), getSubtotal());
                                                                setPromo({ code: res.code, discount_amount: res.discount_amount });
                                                            } catch (e: any) {
                                                                setPromoError(e.message || 'Add more quantity or products to use this promo code.');
                                                            } finally {
                                                                setIsApplyingPromo(false);
                                                            }
                                                        }}
                                                    >
                                                        {isApplyingPromo ? 'Applying...' : 'Apply'}
                                                    </Button>
                                                </div>
                                                {promoError && <div className="text-xs text-destructive">{promoError}</div>}
                                            </div>
                                        )}
                                    </div>


                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Subtotal ({items.length} items)</span>
                                        <span>{formatPrice(getSubtotal())}</span>
                                    </div>
                                    {getDiscount() > 0 && (
                                        <div className="flex justify-between text-green-600">
                                            <span className="text-muted-foreground">Discount</span>
                                            <span>-{formatPrice(getDiscount())}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Delivery Fee</span>
                                        {getDeliveryFee() === 0 ? (
                                            <span className="text-green-600">Free</span>
                                        ) : (
                                            <span>{formatPrice(getDeliveryFee())}</span>
                                        )}
                                    </div>
                                    {getDeliveryFee() > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            Add {formatPrice(getFreeDeliveryShortfall())} more for free delivery.
                                        </p>
                                    )}
                                    <p className="text-xs text-muted-foreground">Inclusive of all taxes</p>
                                    <div className="border-t pt-4 flex justify-between text-lg font-bold">
                                        <span>Total</span>
                                        <span className="text-primary">{formatPrice(getTotal())}</span>
                                    </div>

                                </CardContent>
                                {/* Admin/Seller block banner */}
                                {isAdminOrSeller && (
                                    <div className="mx-4 mb-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 flex items-start gap-2">
                                        <span className="text-lg leading-none">⚠️</span>
                                        <div>
                                            <p className="font-semibold">Admin / Seller account</p>
                                            <p className="text-xs mt-0.5">You cannot place orders with this account. Please use a separate customer account.</p>
                                        </div>
                                    </div>
                                )}
                                <CardFooter>
                                <Button
                                        className="w-full"
                                        size="lg"
                                        onClick={() => router.push('/checkout')}
                                        disabled={!!isAdminOrSeller}
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
