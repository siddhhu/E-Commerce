'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { CreditCard, Banknote, MapPin, ArrowLeft, CheckCircle2, ShoppingBag, FileText, AlertCircle, CheckCircle, Building2 } from 'lucide-react';

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
import { cartApi, usersApi, ordersApi, authApi } from '@/lib/api';
import { formatPrice, cn } from '@/lib/utils';

// Official Indian GST Number regex: 2-digit state + PAN (10 chars) + 1 entity digit + Z + 1 checksum
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const AADHAAR_REGEX = /^[0-9]{12}$/;

function validateDoc(type: string, value: string): boolean {
    const v = value.toUpperCase().trim();
    if (type === 'gst') return GST_REGEX.test(v);
    if (type === 'pan') return PAN_REGEX.test(v);
    if (type === 'aadhaar') return AADHAAR_REGEX.test(v);
    if (type === 'shop_license') return v.length >= 5; // Basic length check
    return true;
}

export default function CheckoutPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { items, getSubtotal, getTax, getTotal, clearCart } = useCartStore();
    const { addOrder } = useOrderStore();
    const { isAuthenticated, isLoading: isAuthLoading, _hasHydrated, user, setUser } = useAuthStore();

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

    // Business Verification — mandatory for Sellers, optional for Customers
    const [docType, setDocType] = useState<'gst' | 'pan' | 'aadhaar' | 'shop_license'>('gst');
    const [docNumber, setDocNumber] = useState('');
    const [docError, setDocError] = useState('');
    const [docValid, setDocValid] = useState(false);
    const [docSavedToProfile, setDocSavedToProfile] = useState(false);

    const savedGst = user?.gst_number;
    const savedPan = user?.pan;
    const savedAadhaar = user?.aadhaar;
    const savedShopLicense = user?.shop_license;

    // Auto-fill from profile on load
    useEffect(() => {
        if (user) {
            if (user.gst_number) {
                setDocType('gst');
                setDocNumber(user.gst_number);
                setDocValid(true);
                setDocSavedToProfile(true);
            } else if (user.pan) {
                setDocType('pan');
                setDocNumber(user.pan);
                setDocValid(true);
                setDocSavedToProfile(true);
            } else if (user.aadhaar) {
                setDocType('aadhaar');
                setDocNumber(user.aadhaar);
                setDocValid(true);
                setDocSavedToProfile(true);
            } else if (user.shop_license) {
                setDocType('shop_license');
                setDocNumber(user.shop_license);
                setDocValid(true);
                setDocSavedToProfile(true);
            }
        }
    }, [user]);

    const handleDocChange = (type: typeof docType, value: string) => {
        const upper = value.toUpperCase().replace(/\s/g, '');
        setDocNumber(upper);
        setDocSavedToProfile(false);

        if (upper.length === 0) {
            setDocValid(false);
            if (user?.user_type === 'seller') {
                setDocError(`${type.toUpperCase()} is required for sellers`);
            } else {
                setDocError('');
            }
        } else if (!validateDoc(type, upper)) {
            setDocError(`Invalid ${type.toUpperCase()} format`);
            setDocValid(false);
        } else {
            setDocError('');
            setDocValid(true);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAddress({ ...address, [e.target.name]: e.target.value });
    };

    const validateForm = () => {
        const required = ['full_name', 'phone', 'address_line1', 'city', 'state', 'postal_code'];
        for (const field of required) {
            if (!address[field as keyof typeof address]) {
                toast({
                    title: 'Missing Information',
                    description: `Please fill in ${field.replace(/_/g, ' ')}`,
                    variant: 'destructive',
                });
                return false;
            }
        }

        // If seller, validation is mandatory
        if (user?.user_type === 'seller') {
            if (!docNumber) {
                toast({
                    title: 'Verification Required',
                    description: 'Sellers must provide a valid business document to proceed.',
                    variant: 'destructive',
                });
                return false;
            }

            if (!docValid) {
                toast({
                    title: 'Invalid Document',
                    description: `Please enter a valid ${docType.toUpperCase()} number.`,
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
            toast({ title: 'Cart Empty', description: 'Please add items to your cart first', variant: 'destructive' });
            return;
        }

        setIsProcessing(true);

        try {
            // 1 & 2. Parallel Tasks: Sync cart and Create/Save Address
            // Note: Profile update is also independent and can be parallelized
            
            const addressTask = usersApi.createAddress({ ...address, country: 'India', is_default: true });
            const syncTask = cartApi.syncAll(items.map(item => ({ product_id: item.product.id, quantity: item.quantity })));
            
            // Start profile update task if needed
            let profileTask = Promise.resolve();
            if (docValid && docNumber && !docSavedToProfile) {
                const updateData: any = {};
                updateData[docType === 'shop_license' ? 'shop_license' : docType] = docNumber;
                profileTask = authApi.updateProfile(updateData).then(u => setUser(u));
            }

            // Wait for address and basic tasks (sync/profile)
            const [savedAddress] = await Promise.all([addressTask, syncTask, profileTask]);

            // 4. Create order (needs address ID)
            const createdOrder = await ordersApi.checkout({
                shipping_address_id: savedAddress.id,
                payment_method: paymentMethod,
            });

            if (paymentMethod === 'cod') {
                completeOrderDisplay(createdOrder.id, createdOrder.order_number, 'cod', 'Cash on Delivery');
            } else {
                const amountInPaise = Math.round(getTotal() * 100);
                try {
                    const options = {
                        key: "rzp_live_SZO4iQslfD86WW",
                        amount: amountInPaise,
                        currency: "INR",
                        name: "Pranjay Cosmetics",
                        description: `Order ${createdOrder.order_number}`,
                        image: "/logo.png",
                        handler: (response: any) => {
                            completeOrderDisplay(createdOrder.id, createdOrder.order_number, 'paid', 'Online Payment');
                        },
                        prefill: { name: address.full_name, email: "customer@example.com", contact: address.phone },
                        theme: { color: "#0f172a" }
                    };
                    const rzp = new (window as any).Razorpay(options);
                    rzp.on('payment.failed', (response: any) => {
                        setIsProcessing(false);
                        toast({ title: 'Payment Failed', description: response.error.description, variant: 'destructive' });
                    });
                    rzp.open();
                } catch (error) {
                    setIsProcessing(false);
                    toast({ title: 'Payment Error', description: 'Could not initialize payment gateway.', variant: 'destructive' });
                }
            }
        } catch (error: any) {
            setIsProcessing(false);
            toast({ title: 'Checkout Failed', description: error.message || 'There was a problem processing your order.', variant: 'destructive' });
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
        toast({ title: 'Order Placed Successfully!', description: `Order #${number} confirmed` });
    };

    // ─── Order Success Screen ───────────────────────────────────────────────
    if (orderPlaced) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center py-12">
                    <div className="text-center max-w-lg mx-auto px-4">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="h-10 w-10 text-green-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-green-800 mb-2">Order Placed!</h1>
                        <p className="text-lg text-muted-foreground mb-2">Order #{orderPlaced.order_number}</p>
                        <p className="text-muted-foreground mb-8">Thank you for your order. We'll send a confirmation shortly.</p>
                        <div className="bg-muted rounded-xl p-5 mb-6 text-left space-y-3">
                            <div className="flex justify-between font-bold text-slate-800 pb-3 border-b">
                                <span>Total</span>
                                <span className="text-primary">{formatPrice(orderPlaced.total_amount)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Payment Method</span>
                                <span className="font-medium">{orderPlaced.payment_method}</span>
                            </div>
                            {docNumber && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{docType.toUpperCase()} Number</span>
                                    <span className="font-mono font-medium text-slate-700">{docNumber}</span>
                                </div>
                            )}
                            <div className="pt-2 border-t">
                                <p className="text-xs text-slate-500 font-semibold mb-1">Delivery Address</p>
                                <p className="text-sm">{orderPlaced.shipping_address.full_name}</p>
                                <p className="text-sm text-muted-foreground">{orderPlaced.shipping_address.address_line1}</p>
                                <p className="text-sm text-muted-foreground">
                                    {orderPlaced.shipping_address.city}, {orderPlaced.shipping_address.state} – {orderPlaced.shipping_address.postal_code}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link href={`/orders/${orderPlaced.id}`}><Button size="lg">View Order Details</Button></Link>
                            <Link href="/products"><Button variant="outline" size="lg"><ShoppingBag className="h-4 w-4 mr-2" />Continue Shopping</Button></Link>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    // ─── Empty Cart Screen ──────────────────────────────────────────────────
    if (items.length === 0) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center py-12">
                    <div className="text-center max-w-md mx-auto px-4">
                        <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h1 className="text-2xl font-bold mb-2">No Items to Checkout</h1>
                        <p className="text-muted-foreground mb-6">Add some products to your cart to proceed.</p>
                        <Link href="/products"><Button size="lg">Browse Products</Button></Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    // ─── Main Checkout Page ─────────────────────────────────────────────────
    return (
        <div className="min-h-screen flex flex-col">
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
            <Header />

            <main className="flex-1 py-8">
                <div className="container max-w-5xl">
                    <Button variant="ghost" className="mb-6" onClick={() => router.push('/cart')}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Cart
                    </Button>
                    <h1 className="text-3xl font-bold mb-8">Checkout</h1>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* ── Left Column ── */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* 1. Business Verification */}
                            <Card className={cn("border-2", docValid ? "border-green-300 bg-green-50/30" : (user?.user_type === 'seller' ? "border-orange-200 bg-orange-50/20" : "border-slate-200"))}>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Building2 className="h-5 w-5 text-primary" />
                                        Business Verification
                                        {user?.user_type === 'seller' && (
                                            <span className="ml-auto text-xs font-normal bg-primary/10 text-primary px-2 py-0.5 rounded-full">Mandatory for Sellers</span>
                                        )}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Auto-fill banner */}
                                    {docSavedToProfile && docNumber && (
                                        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm">
                                            <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="font-semibold text-blue-800">{docType.toUpperCase()} auto-filled from your profile</p>
                                                <button
                                                    type="button"
                                                    className="text-xs text-blue-600 underline mt-0.5"
                                                    onClick={() => { setDocSavedToProfile(false); setDocNumber(''); setDocValid(false); }}
                                                >
                                                    Use a different document
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {!docSavedToProfile && (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Select Document Type</Label>
                                                <select 
                                                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary outline-none"
                                                    value={docType}
                                                    onChange={(e) => {
                                                        const newType = e.target.value as any;
                                                        setDocType(newType);
                                                        handleDocChange(newType, '');
                                                    }}
                                                >
                                                    <option value="gst">GST (Goods and Services Tax)</option>
                                                    <option value="pan">PAN (Permanent Account Number)</option>
                                                    <option value="aadhaar">Aadhaar Card (12-digit)</option>
                                                    <option value="shop_license">Shop License Number</option>
                                                </select>
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label htmlFor="doc_number">
                                                    {docType.toUpperCase()} Number {user?.user_type === 'seller' && <span className="text-red-500">*</span>}
                                                </Label>
                                                <div className="relative">
                                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                    <Input
                                                        id="doc_number"
                                                        className={cn(
                                                            "pl-10 pr-10 font-mono tracking-wider text-sm",
                                                            docError ? "border-red-400 focus-visible:ring-red-300" : docValid ? "border-green-400 focus-visible:ring-green-300" : ""
                                                        )}
                                                        placeholder={`Enter ${docType.toUpperCase()} Number`}
                                                        value={docNumber}
                                                        onChange={(e) => handleDocChange(docType, e.target.value)}
                                                        autoComplete="off"
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                        {docValid && <CheckCircle className="h-4 w-4 text-green-500" />}
                                                        {docError && docNumber && <AlertCircle className="h-4 w-4 text-red-400" />}
                                                    </div>
                                                </div>
                                                {docError && <p className="text-[11px] text-red-500 font-medium">{docError}</p>}
                                                {docValid && <p className="text-[11px] text-green-600 font-medium flex items-center gap-1"><CheckCircle className="h-3 w-3" />Verified — will be saved to your profile.</p>}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* 2. Shipping Address */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MapPin className="h-5 w-5" /> Shipping Address
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-4">
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="full_name">Full Name *</Label>
                                            <Input id="full_name" name="full_name" value={address.full_name} onChange={handleInputChange} placeholder="John Doe" />
                                        </div>
                                        <div>
                                            <Label htmlFor="phone">Phone Number *</Label>
                                            <Input id="phone" name="phone" type="tel" value={address.phone} onChange={handleInputChange} placeholder="+91 98765 43210" />
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="address_line1">Address Line 1 *</Label>
                                        <Input id="address_line1" name="address_line1" value={address.address_line1} onChange={handleInputChange} placeholder="House/Flat No, Building Name" />
                                    </div>
                                    <div>
                                        <Label htmlFor="address_line2">Address Line 2</Label>
                                        <Input id="address_line2" name="address_line2" value={address.address_line2} onChange={handleInputChange} placeholder="Street, Landmark" />
                                    </div>
                                    <div className="grid sm:grid-cols-3 gap-4">
                                        <div>
                                            <Label htmlFor="city">City *</Label>
                                            <Input id="city" name="city" value={address.city} onChange={handleInputChange} placeholder="Mumbai" />
                                        </div>
                                        <div>
                                            <Label htmlFor="state">State *</Label>
                                            <Input id="state" name="state" value={address.state} onChange={handleInputChange} placeholder="Maharashtra" />
                                        </div>
                                        <div>
                                            <Label htmlFor="postal_code">PIN Code *</Label>
                                            <Input id="postal_code" name="postal_code" value={address.postal_code} onChange={handleInputChange} placeholder="400001" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* 3. Payment Method */}
                            <Card>
                                <CardHeader><CardTitle>Payment Method</CardTitle></CardHeader>
                                <CardContent className="space-y-3">
                                    {[
                                        { id: 'cod', label: 'Cash on Delivery', sub: 'Pay when you receive your order', icon: Banknote },
                                        { id: 'online', label: 'Online Payment', sub: 'Pay securely via Razorpay (Cards, UPI, NetBanking)', icon: CreditCard },
                                    ].map(({ id, label, sub, icon: Icon }) => (
                                        <div
                                            key={id}
                                            className={cn(
                                                "border rounded-xl p-4 cursor-pointer transition-all",
                                                paymentMethod === id ? "border-primary bg-primary/5" : "hover:border-slate-300"
                                            )}
                                            onClick={() => setPaymentMethod(id as 'cod' | 'online')}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn("h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0", paymentMethod === id ? "border-primary" : "border-slate-300")}>
                                                    {paymentMethod === id && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                                                </div>
                                                <Icon className="h-5 w-5 text-slate-400" />
                                                <div>
                                                    <p className="font-medium">{label}</p>
                                                    <p className="text-sm text-muted-foreground">{sub}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>

                        {/* ── Right Column: Order Summary ── */}
                        <div>
                            <Card className="sticky top-24">
                                <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-3 max-h-56 overflow-auto pr-1">
                                        {items.map((item) => (
                                            <div key={item.id} className="flex gap-3">
                                                <div className="relative w-12 h-12 rounded bg-muted shrink-0 overflow-hidden">
                                                    {item.product.images?.[0]?.image_url && (
                                                        <Image src={item.product.images[0].image_url} alt={item.product.name} fill className="object-cover" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{item.product.name}</p>
                                                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                                                </div>
                                                <p className="text-sm font-medium">{formatPrice(item.product.selling_price * item.quantity)}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="border-t pt-3 space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Subtotal</span>
                                            <span>{formatPrice(getSubtotal())}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">GST (18%)</span>
                                            <span>{formatPrice(getTax())}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Shipping</span>
                                            <span className="text-green-600 font-medium">Free</span>
                                        </div>
                                        {docValid && docNumber && (
                                            <div className="flex justify-between text-xs bg-blue-50 text-blue-700 px-2 py-1.5 rounded-lg">
                                                <span className="font-medium">{docType.toUpperCase()} Applied</span>
                                                <span className="font-mono">{docNumber}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="border-t pt-3 flex justify-between text-lg font-bold">
                                        <span>Total</span>
                                        <span className="text-primary">{formatPrice(getTotal())}</span>
                                    </div>

                                    {!docValid && user?.user_type === 'seller' && (
                                        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                            <span>Enter your business verification details above to place your order</span>
                                        </div>
                                    )}

                                    <Button
                                        className="w-full"
                                        size="lg"
                                        onClick={handlePlaceOrder}
                                        disabled={isProcessing || (user?.user_type === 'seller' && !docValid)}
                                    >
                                        {isProcessing ? 'Processing...' : (paymentMethod === 'online' ? 'Pay Now' : 'Place Order')}
                                    </Button>

                                    {paymentMethod === 'cod' && (
                                        <p className="text-xs text-center text-muted-foreground">
                                            You will pay {formatPrice(getTotal())} on delivery
                                        </p>
                                    )}

                                    <p className="text-xs text-center text-muted-foreground">
                                        By placing this order, you agree to our{' '}
                                        <a href="/terms" target="_blank" className="text-primary hover:underline font-medium">
                                            Terms &amp; Conditions
                                        </a>
                                    </p>
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
