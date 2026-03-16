'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { CreditCard, Banknote, MapPin, ArrowLeft, CheckCircle2, ShoppingBag } from 'lucide-react';

import Script from 'next/script';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useCartStore } from '@/store/cart-store';
import { useOrderStore, Order } from '@/store/order-store';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import { cartApi, usersApi, ordersApi } from '@/lib/api';
import { formatPrice } from '@/lib/utils';

export default function CheckoutPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { items, getSubtotal, getTax, getTotal, clearCart } = useCartStore();
    const { addOrder, orders } = useOrderStore();
    const { isAuthenticated, isLoading: isAuthLoading, _hasHydrated } = useAuthStore();

    const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');
    const [isProcessing, setIsProcessing] = useState(false);
    const [orderPlaced, setOrderPlaced] = useState<Order | null>(null);
    const [address, setAddress] = useState({
        full_name: '',
        phone: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAddress({ ...address, [e.target.name]: e.target.value });
    };

    const validateForm = () => {
        const required = ['full_name', 'phone', 'address_line1', 'city', 'state', 'postal_code'];
        for (const field of required) {
            if (!address[field as keyof typeof address]) {
                toast({
                    title: 'Missing Information',
                    description: `Please fill in ${field.replace('_', ' ')}`,
                    variant: 'destructive',
                });
                return false;
            }
        }
        return true;
    };

    useEffect(() => {
        if (_hasHydrated && !isAuthLoading && !isAuthenticated) {
            toast({
                title: 'Authentication Required',
                description: 'Please login to complete your checkout.',
            });
            router.push('/login?redirect=/checkout');
            return;
        }
    }, [isAuthenticated, isAuthLoading, _hasHydrated, router, toast]);

    const handlePlaceOrder = async () => {
        if (!validateForm()) return;
        if (items.length === 0) {
            toast({
                title: 'Cart Empty',
                description: 'Please add items to your cart first',
                variant: 'destructive',
            });
            return;
        }

        setIsProcessing(true);

        try {
            // 1. Sync cart with backend
            const itemsToSync = items.map(item => ({
                product_id: item.product.id,
                quantity: item.quantity
            }));
            await cartApi.syncAll(itemsToSync);

            // 2. Save/use Address
            const savedAddress = await usersApi.createAddress({
                ...address,
                country: 'India',
                is_default: true,
            });

            // 3. Create Backend Order
            const createdOrder = await ordersApi.checkout({
                shipping_address_id: savedAddress.id,
                payment_method: paymentMethod,
            });

            if (paymentMethod === 'cod') {
                // Update local orders and UI
                completeOrderDisplay(createdOrder.id, createdOrder.order_number, 'cod', 'Cash on Delivery');
            } else {
                // Online Payment Flow (Razorpay)
                const amountInPaise = Math.round(getTotal() * 100);

                try {
                    const options = {
                        key: "rzp_test_SNyUMfsmuVqnJY",
                        amount: amountInPaise,
                        currency: "INR",
                        name: "Pranjay Cosmetics",
                        description: `Order ${createdOrder.order_number}`,
                        image: "/logo.png",
                        handler: function (response: any) {
                            console.log("Payment successful", response);
                            // In real prod, call backend payment verification loop here
                            completeOrderDisplay(createdOrder.id, createdOrder.order_number, 'paid', 'Online Payment');
                        },
                        prefill: {
                            name: address.full_name,
                            email: "customer@example.com",
                            contact: address.phone
                        },
                        theme: {
                            color: "#0f172a"
                        }
                    };

                    const rzp = new (window as any).Razorpay(options);
                    rzp.on('payment.failed', function (response: any) {
                        console.error("Payment failed", response.error);
                        setIsProcessing(false);
                        toast({
                            title: 'Payment Failed',
                            description: response.error.description,
                            variant: 'destructive',
                        });
                    });

                    rzp.open();
                } catch (error) {
                    console.error("Razorpay setup error", error);
                    setIsProcessing(false);
                    toast({
                        title: 'Payment Error',
                        description: 'Could not initialize payment gateway.',
                        variant: 'destructive',
                    });
                }
            }
        } catch (error: any) {
            console.error("Checkout error:", error);
            setIsProcessing(false);
            toast({
                title: 'Checkout Failed',
                description: error.message || 'There was a problem processing your order.',
                variant: 'destructive',
            });
        }
    };

    const completeOrderDisplay = (id: string, number: string, paymentStatus: string, paymentMethodName: string) => {
        const order: Order = {
            id,
            order_number: number,
            status: 'confirmed',
            payment_status: paymentStatus as any,
            payment_method: paymentMethodName,
            items: items.map(item => ({
                product_id: item.product.id,
                product_name: item.product.name,
                quantity: item.quantity,
                unit_price: item.product.selling_price,
                total_price: item.product.selling_price * item.quantity,
                image_url: item.product.images[0]?.image_url,
            })),
            subtotal: getSubtotal(),
            tax_amount: getTax(),
            shipping_amount: 0,
            total_amount: getTotal(),
            shipping_address: address,
            created_at: new Date().toISOString(),
        };

        addOrder(order);
        setOrderPlaced(order);
        clearCart();
        setIsProcessing(false);

        toast({
            title: 'Order Placed Successfully!',
            description: `Order #${number} confirmed`,
        });
    };

    // Show order success if order was just placed
    if (orderPlaced) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center py-12">
                    <div className="text-center max-w-md mx-auto px-4">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="h-10 w-10 text-green-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-green-800 mb-2">Order Placed!</h1>
                        <p className="text-lg text-muted-foreground mb-2">
                            Order #{orderPlaced.order_number}
                        </p>
                        <p className="text-muted-foreground mb-8">
                            Thank you for your order. We'll send you a confirmation email shortly.
                        </p>
                        <div className="bg-muted rounded-lg p-4 mb-6 text-left">
                            <div className="flex justify-between font-medium mb-3 pb-3 border-b border-slate-200">
                                <span>Total: {formatPrice(orderPlaced.total_amount)}</span>
                                <span className="text-primary">{orderPlaced.payment_method}</span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-slate-700">Delivery Address:</p>
                                <p className="text-sm text-slate-600">{orderPlaced.shipping_address.full_name}</p>
                                <p className="text-sm text-slate-600">
                                    {orderPlaced.shipping_address.address_line1}
                                    {orderPlaced.shipping_address.address_line2 && <>, {orderPlaced.shipping_address.address_line2}</>}
                                </p>
                                <p className="text-sm text-slate-600">
                                    {orderPlaced.shipping_address.city}, {orderPlaced.shipping_address.state} - {orderPlaced.shipping_address.postal_code}
                                </p>
                                <p className="text-sm text-slate-600 font-medium pt-1">
                                    Phone: {orderPlaced.shipping_address.phone}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link href={`/orders/${orderPlaced.id}`}>
                                <Button size="lg">View Order Details</Button>
                            </Link>
                            <Link href="/products">
                                <Button variant="outline" size="lg">
                                    <ShoppingBag className="h-4 w-4 mr-2" />
                                    Continue Shopping
                                </Button>
                            </Link>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    // Show empty state if no items and no recent order
    if (items.length === 0) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center py-12">
                    <div className="text-center max-w-md mx-auto px-4">
                        <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h1 className="text-2xl font-bold mb-2">No Items to Checkout</h1>
                        <p className="text-muted-foreground mb-6">
                            Add some products to your cart to proceed with checkout.
                        </p>
                        <Link href="/products">
                            <Button size="lg">Browse Products</Button>
                        </Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
            <Header />

            <main className="flex-1 py-8">
                <div className="container max-w-5xl">
                    <Button
                        variant="ghost"
                        className="mb-6"
                        onClick={() => router.push('/cart')}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Cart
                    </Button>

                    <h1 className="text-3xl font-bold mb-8">Checkout</h1>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Checkout Form */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Shipping Address */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MapPin className="h-5 w-5" />
                                        Shipping Address
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-4">
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="full_name">Full Name *</Label>
                                            <Input
                                                id="full_name"
                                                name="full_name"
                                                value={address.full_name}
                                                onChange={handleInputChange}
                                                placeholder="John Doe"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="phone">Phone Number *</Label>
                                            <Input
                                                id="phone"
                                                name="phone"
                                                type="tel"
                                                value={address.phone}
                                                onChange={handleInputChange}
                                                placeholder="+91 98765 43210"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="address_line1">Address Line 1 *</Label>
                                        <Input
                                            id="address_line1"
                                            name="address_line1"
                                            value={address.address_line1}
                                            onChange={handleInputChange}
                                            placeholder="House/Flat No, Building Name"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="address_line2">Address Line 2</Label>
                                        <Input
                                            id="address_line2"
                                            name="address_line2"
                                            value={address.address_line2}
                                            onChange={handleInputChange}
                                            placeholder="Street, Landmark"
                                        />
                                    </div>
                                    <div className="grid sm:grid-cols-3 gap-4">
                                        <div>
                                            <Label htmlFor="city">City *</Label>
                                            <Input
                                                id="city"
                                                name="city"
                                                value={address.city}
                                                onChange={handleInputChange}
                                                placeholder="Mumbai"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="state">State *</Label>
                                            <Input
                                                id="state"
                                                name="state"
                                                value={address.state}
                                                onChange={handleInputChange}
                                                placeholder="Maharashtra"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="postal_code">PIN Code *</Label>
                                            <Input
                                                id="postal_code"
                                                name="postal_code"
                                                value={address.postal_code}
                                                onChange={handleInputChange}
                                                placeholder="400001"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Payment Method */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Payment Method</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div
                                        className={`border rounded-lg p-4 cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground'
                                            }`}
                                        onClick={() => setPaymentMethod('cod')}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'cod' ? 'border-primary' : 'border-muted-foreground'
                                                }`}>
                                                {paymentMethod === 'cod' && (
                                                    <div className="h-3 w-3 rounded-full bg-primary" />
                                                )}
                                            </div>
                                            <Banknote className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">Cash on Delivery</p>
                                                <p className="text-sm text-muted-foreground">Pay when you receive your order</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        className={`border rounded-lg p-4 cursor-pointer transition-all ${paymentMethod === 'online' ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground'
                                            }`}
                                        onClick={() => setPaymentMethod('online')}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'online' ? 'border-primary' : 'border-muted-foreground'
                                                }`}>
                                                {paymentMethod === 'online' && (
                                                    <div className="h-3 w-3 rounded-full bg-primary" />
                                                )}
                                            </div>
                                            <CreditCard className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">Online Payment</p>
                                                <p className="text-sm text-muted-foreground">Pay securely via Razorpay (Cards, UPI, NetBanking)</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Order Summary */}
                        <div>
                            <Card className="sticky top-24">
                                <CardHeader>
                                    <CardTitle>Order Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Items */}
                                    <div className="space-y-3 max-h-60 overflow-auto">
                                        {items.map((item) => (
                                            <div key={item.id} className="flex gap-3">
                                                <div className="relative w-12 h-12 rounded bg-muted shrink-0">
                                                    <Image
                                                        src={item.product.images[0]?.image_url}
                                                        alt={item.product.name}
                                                        fill
                                                        className="object-cover rounded"
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{item.product.name}</p>
                                                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                                                </div>
                                                <p className="text-sm font-medium">
                                                    {formatPrice(item.product.selling_price * item.quantity)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="border-t pt-4 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Subtotal</span>
                                            <span>{formatPrice(getSubtotal())}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">GST (18%)</span>
                                            <span>{formatPrice(getTax())}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Shipping</span>
                                            <span className="text-green-600">Free</span>
                                        </div>
                                    </div>

                                    <div className="border-t pt-4 flex justify-between text-lg font-bold">
                                        <span>Total</span>
                                        <span className="text-primary">{formatPrice(getTotal())}</span>
                                    </div>

                                    <Button
                                        className="w-full"
                                        size="lg"
                                        onClick={handlePlaceOrder}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? 'Processing...' : (paymentMethod === 'online' ? 'Pay Now' : 'Place Order')}
                                    </Button>

                                    {paymentMethod === 'cod' && (
                                        <p className="text-xs text-center text-muted-foreground">
                                            You will pay {formatPrice(getTotal())} on delivery
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
