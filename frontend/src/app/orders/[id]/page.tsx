'use client';

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, Package, Truck, MapPin, ArrowLeft, ShoppingBag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useOrderStore } from '@/store/order-store';
import { formatPrice, formatDate } from '@/lib/utils';

export default function OrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { getOrderById } = useOrderStore();

    const order = getOrderById(params.id as string);

    if (!order) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h1 className="text-2xl font-bold">Order Not Found</h1>
                        <p className="text-muted-foreground mt-2">This order doesn't exist or has expired.</p>
                        <Link href="/orders">
                            <Button className="mt-6">View All Orders</Button>
                        </Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    const statusSteps = [
        { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
        { key: 'processing', label: 'Processing', icon: Package },
        { key: 'shipped', label: 'Shipped', icon: Truck },
        { key: 'delivered', label: 'Delivered', icon: MapPin },
    ];

    const currentStepIndex = statusSteps.findIndex(step => step.key === order.status);

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 py-8">
                <div className="container max-w-4xl">
                    <Button
                        variant="ghost"
                        className="mb-6"
                        onClick={() => router.push('/orders')}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Orders
                    </Button>

                    {/* Order Success Banner */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 text-center">
                        <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
                        <h1 className="text-2xl font-bold text-green-800">Order Placed Successfully!</h1>
                        <p className="text-green-700 mt-1">
                            Thank you for your order. We'll send you a confirmation email shortly.
                        </p>
                    </div>

                    {/* Order Info */}
                    <Card className="mb-8">
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Order Number</p>
                                    <CardTitle className="text-2xl">{order.order_number}</CardTitle>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Placed on</p>
                                    <p className="font-medium">{formatDate(order.created_at)}</p>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    {/* Status Tracker */}
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle>Order Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                {statusSteps.map((step, index) => {
                                    const isActive = index <= currentStepIndex;
                                    const isCurrent = index === currentStepIndex;

                                    return (
                                        <div key={step.key} className="flex flex-col items-center flex-1">
                                            <div className={`relative flex items-center justify-center w-10 h-10 rounded-full ${isActive ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                                                } ${isCurrent ? 'ring-4 ring-primary/30' : ''}`}>
                                                <step.icon className="h-5 w-5" />
                                            </div>
                                            <p className={`text-sm mt-2 ${isActive ? 'font-medium' : 'text-muted-foreground'}`}>
                                                {step.label}
                                            </p>
                                            {index < statusSteps.length - 1 && (
                                                <div className={`absolute h-0.5 w-full max-w-20 hidden sm:block ${index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                                                    }`} style={{ left: '50%', top: '20px' }} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Order Items */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Order Items</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {order.items.map((item, index) => (
                                    <div key={index} className="flex gap-4">
                                        <div className="relative w-16 h-16 rounded bg-muted shrink-0">
                                            <Image
                                                src={item.image_url}
                                                alt={item.product_name}
                                                fill
                                                className="object-cover rounded"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium">{item.product_name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatPrice(item.unit_price)} × {item.quantity}
                                            </p>
                                        </div>
                                        <p className="font-medium">{formatPrice(item.total_price)}</p>
                                    </div>
                                ))}

                                <div className="border-t pt-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span>{formatPrice(order.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Tax</span>
                                        <span>{formatPrice(order.tax_amount)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Shipping</span>
                                        <span className="text-green-600">Free</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                                        <span>Total</span>
                                        <span className="text-primary">{formatPrice(order.total_amount)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Delivery & Payment */}
                        <div className="space-y-8">
                            {/* Shipping Address */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MapPin className="h-5 w-5" />
                                        Delivery Address
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="font-medium">{order.shipping_address.full_name}</p>
                                    <p className="text-muted-foreground">{order.shipping_address.phone}</p>
                                    <p className="text-muted-foreground mt-2">
                                        {order.shipping_address.address_line1}
                                        {order.shipping_address.address_line2 && `, ${order.shipping_address.address_line2}`}
                                    </p>
                                    <p className="text-muted-foreground">
                                        {order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.postal_code}
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Payment */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Payment Details</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-medium">{order.payment_method}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {order.payment_status === 'cod' ? 'Pay on Delivery' : 'Paid'}
                                            </p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${order.payment_status === 'paid'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-amber-100 text-amber-700'
                                            }`}>
                                            {order.payment_status === 'cod' ? 'COD' : order.payment_status}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-8 flex justify-center gap-4">
                        <Link href="/products">
                            <Button variant="outline">
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
