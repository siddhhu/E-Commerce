'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CreditCard, Banknote, MapPin, ArrowLeft, CheckCircle2, ShoppingBag, FileText, AlertCircle, CheckCircle, Building2, Shield, Truck } from 'lucide-react';

import Script from 'next/script';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShopShell } from '@/components/layout/ShopShell';
import { useCartStore } from '@/store/cart-store';
import { useOrderStore, Order } from '@/store/order-store';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import { cartApi, usersApi, ordersApi, authApi } from '@/lib/api';
import { formatPrice, cn, resolveImageUrl } from '@/lib/utils';
import {
    COD_RESTRICTED_MESSAGE,
    isCodAllowedForPostalCode,
} from '@/lib/payment-rules';
import { ShoppingOffersBar } from '@/components/shop/ShoppingOffersBar';
import { NativeFileUploadZone } from '@/components/native/NativeFileUploadZone';

// Official Indian GST Number regex: 2-digit state + PAN (10 chars) + 1 entity digit + Z + 1 checksum
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const AADHAAR_REGEX = /^[0-9]{12}$/;
const VOTER_ID_REGEX = /^[A-Z0-9]{10,20}$/;
const UDYAM_REGEX = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/;

type DocType =
    | 'gst'
    | 'pan'
    | 'aadhaar'
    | 'voter_id'
    | 'shop_license'
    | 'msme'
    | 'shop_establishment'
    | 'udyog_aadhar';

const DOC_TYPE_LABELS: Record<DocType, string> = {
    gst: 'GST Certificate',
    pan: 'PAN Card',
    aadhaar: 'Aadhaar Card',
    voter_id: 'Voter ID',
    shop_license: 'Shop License',
    msme: 'MSME Certificate',
    shop_establishment: 'Shop & Establishment License',
    udyog_aadhar: 'UDyog Aadhar (Udyam)',
};

function validateDoc(type: string, value: string): boolean {
    const v = value.toUpperCase().trim().replace(/\s/g, '');
    if (type === 'gst') return GST_REGEX.test(v);
    if (type === 'pan') return PAN_REGEX.test(v);
    if (type === 'aadhaar') return AADHAAR_REGEX.test(v.replace(/-/g, ''));
    if (type === 'voter_id') return VOTER_ID_REGEX.test(v);
    if (type === 'msme' || type === 'udyog_aadhar') return UDYAM_REGEX.test(v) || v.length >= 5;
    if (type === 'shop_license' || type === 'shop_establishment') return v.length >= 5;
    return true;
}

function getDocNumberFromUser(user: { kyc_document_type?: string | null; gst_number?: string; pan?: string; aadhaar?: string; voter_id?: string; shop_license?: string; msme_number?: string; shop_establishment_license?: string; udyog_aadhar?: string }): string {
    const type = user.kyc_document_type as DocType | undefined;
    const fieldMap: Record<DocType, string | undefined> = {
        gst: user.gst_number,
        pan: user.pan,
        aadhaar: user.aadhaar,
        voter_id: user.voter_id,
        shop_license: user.shop_license,
        msme: user.msme_number,
        shop_establishment: user.shop_establishment_license,
        udyog_aadhar: user.udyog_aadhar,
    };
    if (type && fieldMap[type]) return fieldMap[type]!;
    return user.gst_number || user.pan || user.aadhaar || user.voter_id || user.shop_license || user.msme_number || user.shop_establishment_license || user.udyog_aadhar || '';
}

export default function CheckoutPage() {
    const router = useRouter();
    const { toast } = useToast();
    const {
        items,
        getSubtotal,
        getDiscount,
        getPromoDiscount,
        getBulkDiscountAmount,
        getDeliveryFee,
        getFreeDeliveryShortfall,
        getTax,
        getTotal,
        clearCart,
        promo_code,
    } = useCartStore();
    const { addOrder } = useOrderStore();
    const { isAuthenticated, isLoading: isAuthLoading, _hasHydrated, user, setUser } = useAuthStore();

    const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('online');
    const [isProcessing, setIsProcessing] = useState(false);
    const [orderPlaced, setOrderPlaced] = useState<Order | null>(null);
    const [isRazorpayReady, setIsRazorpayReady] = useState(false);
    const [prefetchedPrep, setPrefetchedPrep] = useState<{
        razorpay_order_id: string;
        amount_paise: number;
        amount_display: number;
    } | null>(null);
    const prefetchedPrepKeyRef = useRef<string>('');
    const [savedAddressId, setSavedAddressId] = useState<string | null>(null); // pre-loaded address
    const [address, setAddress] = useState({
        full_name: '',
        phone: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
    });

    // Business Verification — one-time KYC with document upload
    const [docType, setDocType] = useState<DocType>('gst');
    const [docNumber, setDocNumber] = useState('');
    const [docError, setDocError] = useState('');
    const [docValid, setDocValid] = useState(false);
    const [docFile, setDocFile] = useState<File | null>(null);
    const [docFileUrl, setDocFileUrl] = useState('');
    const [docUploading, setDocUploading] = useState(false);

    const kycComplete = Boolean(user?.kyc_verified_at && user?.kyc_document_url);
    const verifiedDocType = (user?.kyc_document_type as DocType | undefined) || docType;
    const verifiedDocLabel = DOC_TYPE_LABELS[verifiedDocType] || verifiedDocType.toUpperCase();
    const verifiedDocNumber = user ? getDocNumberFromUser(user) : docNumber;

    // Auto-fill from profile on load (only if KYC not yet complete)
    useEffect(() => {
        if (!user || kycComplete) return;

        const preferredType = (user.kyc_document_type as DocType | undefined)
            || (user.gst_number ? 'gst'
                : user.pan ? 'pan'
                : user.aadhaar ? 'aadhaar'
                : user.voter_id ? 'voter_id'
                : user.shop_license ? 'shop_license'
                : user.msme_number ? 'msme'
                : user.shop_establishment_license ? 'shop_establishment'
                : user.udyog_aadhar ? 'udyog_aadhar'
                : 'gst');

        const savedNumber = getDocNumberFromUser({ ...user, kyc_document_type: preferredType });
        if (savedNumber) {
            setDocType(preferredType);
            setDocNumber(savedNumber);
            setDocValid(validateDoc(preferredType, savedNumber));
        }
    }, [user, kycComplete]);

    const handleDocChange = (type: DocType, value: string) => {
        const upper = value.toUpperCase().replace(/\s/g, '');
        setDocNumber(upper);

        if (upper.length === 0) {
            setDocValid(false);
            setDocError(`${DOC_TYPE_LABELS[type]} number is required`);
        } else if (!validateDoc(type, upper)) {
            setDocError(`Invalid ${DOC_TYPE_LABELS[type]} format`);
            setDocValid(false);
        } else {
            setDocError('');
            setDocValid(true);
        }
    };

    const handleDocFileSelect = async (file: File | null) => {
        if (!file) return;
        setDocFile(file);
        setDocUploading(true);
        try {
            const { document_url } = await usersApi.uploadKycDocument(file);
            setDocFileUrl(document_url);
            toast({
                title: 'Document uploaded',
                description: 'Your document is ready. You can proceed to place the order.',
            });
        } catch (error: any) {
            setDocFile(null);
            setDocFileUrl('');
            toast({
                title: 'Upload failed',
                description: error.message || 'Could not upload document. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setDocUploading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setAddress({ ...address, [e.target.name]: e.target.value });
    };

    const codAllowed = isCodAllowedForPostalCode(address.postal_code);
    const codRestricted = address.postal_code.trim().length >= 6 && !codAllowed;

    useEffect(() => {
        if (codRestricted && paymentMethod === 'cod') {
            setPaymentMethod('online');
        }
    }, [codRestricted, paymentMethod]);

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

        if (!kycComplete) {
            if (!docNumber || !docValid) {
                toast({
                    title: 'Verification Required',
                    description: 'Please select a document type and enter a valid number to proceed.',
                    variant: 'destructive',
                });
                return false;
            }
            if (!docFileUrl) {
                toast({
                    title: 'Upload Required',
                    description: 'Please upload your document. This is a one-time verification.',
                    variant: 'destructive',
                });
                return false;
            }
        }

        return true;
    };

    useEffect(() => {
        if (!_hasHydrated || isAuthLoading) return;

        if (!isAuthenticated) {
            toast({
                title: 'Authentication Required',
                description: 'Please login to complete your checkout.',
            });
            router.push('/login?redirect=/checkout');
            return;
        }

        // Block admin/seller from checkout
        const role = (user?.role || '').toString().toLowerCase();
        const isAdminOrSeller = (
            role === 'admin' || role === 'super_admin' ||
            (user?.seller_status === 'approved' && user?.user_type === 'seller')
        );
        if (isAdminOrSeller) {
            toast({
                title: '⚠️ Admin / Seller Account',
                description: 'You cannot place orders with this account. Please use a separate customer account.',
                variant: 'destructive',
            });
            router.push('/cart');
        }
    }, [isAuthenticated, isAuthLoading, _hasHydrated, user, router, toast]);


    // ── DB Warmup: fire checkout-prep as soon as auth is confirmed ──────────
    // This pre-warms the Supabase connection so the actual checkout call is fast.
    useEffect(() => {
        if (!isAuthenticated || !_hasHydrated || isAuthLoading) return;
        usersApi.getCheckoutPrep()
            .then(data => {
                // If user has a saved default address, pre-fill the form
                const defaultAddr = data.addresses?.find((a: any) => a.is_default) || data.addresses?.[0];
                if (defaultAddr) {
                    setSavedAddressId(defaultAddr.id);
                    setAddress({
                        full_name: defaultAddr.full_name || '',
                        phone: defaultAddr.phone || '',
                        address_line1: defaultAddr.address_line1 || '',
                        address_line2: defaultAddr.address_line2 || '',
                        city: defaultAddr.city || '',
                        state: defaultAddr.state || '',
                        postal_code: defaultAddr.postal_code || '',
                    });
                }
            })
            .catch(() => { /* Non-critical: warmup failed, checkout will still work */ });
    }, [isAuthenticated, _hasHydrated, isAuthLoading]);

    const cartPayload = useMemo(
        () => items.map(item => ({ product_id: item.product.id, quantity: item.quantity })),
        [items]
    );

    const checkoutPayloadBase = useMemo(
        () => ({
            full_name: address.full_name,
            phone: address.phone,
            address_line1: address.address_line1,
            address_line2: address.address_line2 || undefined,
            city: address.city,
            state: address.state,
            postal_code: address.postal_code,
            country: 'India' as const,
            existing_address_id: savedAddressId || undefined,
            cart_items: cartPayload,
            promo_code: promo_code || undefined,
        }),
        [address, savedAddressId, cartPayload, promo_code]
    );

    // Pre-warm Razorpay order while user is on checkout with online payment selected
    useEffect(() => {
        if (paymentMethod !== 'online' || cartPayload.length === 0 || !isAuthenticated) {
            setPrefetchedPrep(null);
            return;
        }
        const key = JSON.stringify({ cart: cartPayload, promo: promo_code || '' });
        if (prefetchedPrepKeyRef.current === key && prefetchedPrep) return;

        const timer = window.setTimeout(() => {
            ordersApi.prepareCheckout({
                cart_items: cartPayload,
                promo_code: promo_code || undefined,
            })
                .then((prep) => {
                    prefetchedPrepKeyRef.current = key;
                    setPrefetchedPrep(prep);
                })
                .catch(() => setPrefetchedPrep(null));
        }, 400);

        return () => window.clearTimeout(timer);
    }, [paymentMethod, cartPayload, promo_code, isAuthenticated]);

    const ensureKycSubmitted = useCallback(async () => {
        if (kycComplete) return true;
        if (!docValid || !docNumber || !docFileUrl) return false;
        try {
            const updated = await authApi.submitKyc({
                document_type: docType,
                document_number: docNumber,
                document_url: docFileUrl,
            });
            setUser(updated);
            return true;
        } catch (error: any) {
            toast({
                title: 'Verification failed',
                description: error.message || 'Could not save your document verification.',
                variant: 'destructive',
            });
            return false;
        }
    }, [kycComplete, docValid, docNumber, docFileUrl, docType, setUser, toast]);

    const handlePlaceOrder = async () => {
        if (!validateForm()) return;
        if (items.length === 0) {
            toast({ title: 'Cart Empty', description: 'Please add items to your cart first', variant: 'destructive' });
            return;
        }

        if (promo_code && getDiscount() <= 0) {
            toast({
                title: 'Promo needs a higher cart value',
                description: 'Add more quantity or products to use this promo code.',
                variant: 'destructive',
            });
            return;
        }

        if (paymentMethod === 'cod' && !isCodAllowedForPostalCode(address.postal_code)) {
            toast({
                title: 'COD not available',
                description: COD_RESTRICTED_MESSAGE,
                variant: 'destructive',
            });
            return;
        }

        if (paymentMethod === 'online' && (!(window as any).Razorpay || !isRazorpayReady)) {
            toast({
                title: 'Payment Loading',
                description: 'Payment gateway is still loading. Please try again in a moment.',
            });
            return;
        }

        setIsProcessing(true);

        try {
            const kycReady = await ensureKycSubmitted();
            if (!kycReady) {
                setIsProcessing(false);
                return;
            }

            if (paymentMethod === 'cod') {
                const createdOrder = await ordersApi.completeCheckout({
                    ...checkoutPayloadBase,
                    payment_method: 'cod',
                });
                completeOrderDisplay(createdOrder.id, createdOrder.order_number, 'cod', 'Cash on Delivery');

            } else {
                const prepKey = JSON.stringify({ cart: cartPayload, promo: promo_code || '' });
                let prep = prefetchedPrep && prefetchedPrepKeyRef.current === prepKey ? prefetchedPrep : null;
                if (!prep) {
                    prep = await ordersApi.prepareCheckout({
                        cart_items: cartPayload,
                        promo_code: promo_code || undefined,
                    });
                }

                let paymentHandled = false;

                const handleCancel = (reason: string) => {
                    if (paymentHandled) return;
                    paymentHandled = true;
                    setIsProcessing(false);
                    toast({
                        title: reason,
                        description: 'No charges were made. Your cart is still intact.',
                        variant: 'default',
                    });
                    router.push('/cart');
                };

                const options = {
                    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_live_SZO4iQslfD86WW",
                    amount: prep.amount_paise,
                    currency: "INR",
                    name: "Pranjay Cosmetics",
                    description: `Order of ${items.length} item${items.length !== 1 ? 's' : ''}`,
                    image: "/logo.png",
                    order_id: prep.razorpay_order_id,
                    prefill: { name: address.full_name, email: user?.email || "customer@example.com", contact: address.phone },
                    theme: { color: "#0f172a" },

                    handler: async (response: any) => {
                        paymentHandled = true;
                        try {
                            const createdOrder = await ordersApi.completeCheckout({
                                ...checkoutPayloadBase,
                                payment_method: 'online',
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature,
                            });
                            completeOrderDisplay(createdOrder.id, createdOrder.order_number, 'paid', 'Online Payment');
                        } catch (err: any) {
                            setIsProcessing(false);
                            toast({
                                title: 'Order Creation Failed',
                                description: err.message || 'Payment was received but order could not be created. Contact support.',
                                variant: 'destructive',
                            });
                        }
                    },

                    modal: {
                        ondismiss: () => handleCancel('Payment Cancelled'),
                    },
                };

                const rzp = new (window as any).Razorpay(options);
                rzp.on('payment.failed', (response: any) => {
                    handleCancel(response.error?.description || 'Payment Failed');
                });
                setIsProcessing(false);
                rzp.open();
                return;
            }
        } catch (error: any) {
            setIsProcessing(false);
            toast({ title: 'Checkout Failed', description: error.message || 'There was a problem. Please try again.', variant: 'destructive' });
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
            shipping_amount: getDeliveryFee(),
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
            <ShopShell hideBottomNav mainClassName="flex items-center justify-center py-12">
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
                            {verifiedDocNumber && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{verifiedDocLabel}</span>
                                    <span className="font-mono font-medium text-slate-700">{verifiedDocNumber}</span>
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
            </ShopShell>
        );
    }

    // ─── Empty Cart Screen ──────────────────────────────────────────────────
    if (items.length === 0) {
        return (
            <ShopShell hideBottomNav mainClassName="flex items-center justify-center py-12">
                <div className="text-center max-w-md mx-auto px-4">
                        <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h1 className="text-2xl font-bold mb-2">No Items to Checkout</h1>
                        <p className="text-muted-foreground mb-6">Add some products to your cart to proceed.</p>
                        <Link href="/products"><Button size="lg">Browse Products</Button></Link>
                </div>
            </ShopShell>
        );
    }

    // ─── Main Checkout Page ─────────────────────────────────────────────────
    return (
        <ShopShell hideBottomNav mainClassName="py-8">
            <Script
                src="https://checkout.razorpay.com/v1/checkout.js"
                strategy="afterInteractive"
                onLoad={() => setIsRazorpayReady(true)}
            />
                <div className="container max-w-5xl">
                    <Button variant="ghost" className="mb-6" onClick={() => router.push('/cart')}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Cart
                    </Button>
                    <h1 className="text-3xl font-bold mb-8">Checkout</h1>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* ── Left Column ── */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* 1. Business Verification — one-time KYC */}
                            <Card className={cn("border-2", kycComplete || docValid ? "border-green-300 bg-green-50/30" : "border-orange-200 bg-orange-50/20")}>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Building2 className="h-5 w-5 text-primary" />
                                        Business Verification
                                        <span className="ml-auto text-xs font-normal bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                            One-time only
                                        </span>
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground">
                                        Upload your business or identity document once. You won&apos;t be asked again on future orders.
                                    </p>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {kycComplete ? (
                                        <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
                                            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="font-semibold text-green-800">Verification complete</p>
                                                <p className="text-green-700 mt-1">
                                                    {verifiedDocLabel}
                                                    {verifiedDocNumber ? ` · ${verifiedDocNumber}` : ''}
                                                </p>
                                                <p className="text-xs text-green-600 mt-1">Saved to your profile — no need to upload again.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Select Document Type</Label>
                                                <select
                                                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary outline-none"
                                                    value={docType}
                                                    onChange={(e) => {
                                                        const newType = e.target.value as DocType;
                                                        setDocType(newType);
                                                        handleDocChange(newType, '');
                                                        setDocFile(null);
                                                        setDocFileUrl('');
                                                    }}
                                                >
                                                    <option value="gst">GST Certificate</option>
                                                    <option value="pan">PAN Card</option>
                                                    <option value="aadhaar">Aadhaar Card</option>
                                                    <option value="voter_id">Voter ID</option>
                                                    <option value="shop_license">Shop License</option>
                                                    <option value="msme">MSME Certificate</option>
                                                    <option value="shop_establishment">Shop &amp; Establishment License</option>
                                                    <option value="udyog_aadhar">UDyog Aadhar (Udyam)</option>
                                                </select>
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label htmlFor="doc_number">
                                                    {DOC_TYPE_LABELS[docType]} Number <span className="text-red-500">*</span>
                                                </Label>
                                                <div className="relative">
                                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                    <Input
                                                        id="doc_number"
                                                        className={cn(
                                                            "pl-10 pr-10 font-mono tracking-wider text-sm",
                                                            docError ? "border-red-400 focus-visible:ring-red-300" : docValid ? "border-green-400 focus-visible:ring-green-300" : ""
                                                        )}
                                                        placeholder={`Enter ${DOC_TYPE_LABELS[docType]} number`}
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
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Upload Document <span className="text-red-500">*</span></Label>
                                                <NativeFileUploadZone
                                                    selectedFile={docFile}
                                                    uploading={docUploading}
                                                    onSelect={handleDocFileSelect}
                                                    title="Tap to upload your document"
                                                    hint="PDF, JPG, or PNG · Max 10MB"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* 2. Delivery Address */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MapPin className="h-5 w-5" /> Delivery Address
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
                                            <Input id="phone" name="phone" type="tel" value={address.phone} onChange={handleInputChange as any} placeholder="+91 78700 53331" />
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
                                            <select
                                                id="state"
                                                name="state"
                                                value={address.state}
                                                onChange={handleInputChange as any}
                                                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                            >
                                                <option value="">Select State</option>
                                                {[
                                                    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
                                                    'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
                                                    'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
                                                    'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
                                                    'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
                                                    'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
                                                    'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
                                                    'Andaman and Nicobar Islands', 'Chandigarh',
                                                    'Dadra and Nagar Haveli and Daman and Diu',
                                                    'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
                                                ].map((s) => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <Label htmlFor="postal_code">PIN Code *</Label>
                                            <Input id="postal_code" name="postal_code" value={address.postal_code} onChange={handleInputChange} placeholder="400001" />
                                        </div>
                                    </div>
                                    {codRestricted && (
                                        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                            <p>{COD_RESTRICTED_MESSAGE}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* 3. Payment Method */}
                            <Card>
                                <CardHeader><CardTitle>Payment Method</CardTitle></CardHeader>
                                <CardContent className="space-y-3">
                                    {[
                                        { id: 'cod', label: 'Cash on Delivery', sub: 'Pay when you receive your order', icon: Banknote },
                                        { id: 'online', label: 'Online Payment', sub: 'Pay securely via Razorpay (Cards, UPI, NetBanking)', icon: CreditCard },
                                    ].map(({ id, label, sub, icon: Icon }) => {
                                        const isCodOption = id === 'cod';
                                        const isDisabled = isCodOption && !codAllowed;

                                        return (
                                        <div
                                            key={id}
                                            className={cn(
                                                "border rounded-xl p-4 transition-all",
                                                isDisabled
                                                    ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                                                    : "cursor-pointer",
                                                !isDisabled && paymentMethod === id ? "border-primary bg-primary/5" : !isDisabled ? "hover:border-slate-300" : ""
                                            )}
                                            onClick={() => {
                                                if (isDisabled) return;
                                                setPaymentMethod(id as 'cod' | 'online');
                                            }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn("h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0", paymentMethod === id && !isDisabled ? "border-primary" : "border-slate-300")}>
                                                    {paymentMethod === id && !isDisabled && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                                                </div>
                                                <Icon className="h-5 w-5 text-slate-400" />
                                                <div>
                                                    <p className="font-medium">{label}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {isDisabled ? 'Not available outside Bihar' : sub}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>

                            <div className="grid sm:grid-cols-3 gap-3">
                                {[
                                    { icon: Shield, title: 'Genuine Products', sub: 'Verified cosmetic catalog' },
                                    { icon: CheckCircle2, title: 'Easy Support', sub: 'Help with every order' },
                                    { icon: Truck, title: 'Fast Dispatch', sub: 'Packed for quick delivery' },
                                ].map(({ icon: Icon, title, sub }) => (
                                    <div key={title} className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
                                        <Icon className="h-5 w-5 text-primary mb-2" />
                                        <p className="font-bold text-slate-900 text-sm">{title}</p>
                                        <p className="text-xs text-slate-600 mt-1">{sub}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── Right Column: Order Summary ── */}
                        <div>
                            <Card className="sticky top-24">
                                <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <ShoppingOffersBar
                                        subtotal={getSubtotal()}
                                        promoDiscount={getPromoDiscount()}
                                        compact
                                    />
                                    <div className="space-y-3 max-h-56 overflow-auto pr-1">
                                        {items.map((item) => (
                                            <div key={item.id} className="flex gap-3">
                                                <div className="relative w-12 h-12 rounded bg-muted shrink-0 overflow-hidden">
                                                    <img
                                                        src={resolveImageUrl(item.product.image_url || item.product.images?.[0]?.image_url)}
                                                        alt={item.product.name}
                                                        className="h-full w-full object-cover"
                                                    />
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
                                        {getPromoDiscount() > 0 && (
                                            <div className="flex justify-between text-green-600">
                                                <span className="text-muted-foreground">Promo discount</span>
                                                <span>-{formatPrice(getPromoDiscount())}</span>
                                            </div>
                                        )}
                                        {getBulkDiscountAmount() > 0 && (
                                            <div className="flex justify-between text-green-600">
                                                <span className="text-muted-foreground">Extra 1% off (₹10K+)</span>
                                                <span>-{formatPrice(getBulkDiscountAmount())}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Delivery Fee</span>
                                            {getDeliveryFee() === 0 ? (
                                                <span className="text-green-600 font-medium">Free</span>
                                            ) : (
                                                <span className="font-medium">{formatPrice(getDeliveryFee())}</span>
                                            )}
                                        </div>
                                        {getDeliveryFee() > 0 && (
                                            <p className="text-xs text-muted-foreground">
                                                Add {formatPrice(getFreeDeliveryShortfall())} more for free delivery.
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground pt-1">Inclusive of all taxes</p>
                                        {docValid && docNumber && !kycComplete && (
                                            <div className="flex justify-between text-xs bg-blue-50 text-blue-700 px-2 py-1.5 rounded-lg">
                                                <span className="font-medium">{DOC_TYPE_LABELS[docType]} ready</span>
                                                <span className="font-mono">{docNumber}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="border-t pt-3 flex justify-between text-lg font-bold">
                                        <span>Total</span>
                                        <span className="text-primary">{formatPrice(getTotal())}</span>
                                    </div>

                                    <div className="grid gap-2 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <Shield className="h-4 w-4 text-primary" />
                                            <span>100% genuine beauty products</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-primary" />
                                            <span>Support available for order help</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Truck className="h-4 w-4 text-primary" />
                                            <span>Free delivery above ₹3,000 · Extra 1% off on ₹10,000+</span>
                                        </div>
                                    </div>

                                    {!kycComplete && (!docValid || !docFileUrl) && (
                                        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                            <span>Complete one-time verification above — enter document number and upload file to proceed.</span>
                                        </div>
                                    )}

                                    <Button
                                        className="w-full"
                                        size="lg"
                                        onClick={handlePlaceOrder}
                                        disabled={isProcessing || docUploading || (!kycComplete && (!docValid || !docFileUrl))}
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
        </ShopShell>
    );
}
