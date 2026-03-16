'use client';

import { useEffect, useState } from 'react';
import { adminApi, Order } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package, Truck, CreditCard, User as UserIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function AdminOrderDetailPage({ params }: { params: { id: string } }) {
    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const fetchOrder = async () => {
        setIsLoading(true);
        try {
            const data = await adminApi.getOrder(params.id);
            setOrder(data);
        } catch (error: any) {
             toast({
                title: "Error fetching order",
                description: error.message || "Failed to load order details",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();
    }, [params.id]);

    const handleStatusChange = async (newStatus: string) => {
        try {
            await adminApi.updateOrderStatus(params.id, newStatus);
            toast({ title: "Order status updated successfully" });
            fetchOrder(); // refresh data
        } catch (error: any) {
            toast({
                title: "Failed to update status",
                description: error.message || "Ensure you have the right permissions.",
                variant: "destructive"
            });
        }
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500">Loading order details...</div>;
    if (!order) return <div className="p-8 text-center text-slate-500">Order not found.</div>;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4">
                <Link href="/admin/orders">
                    <Button variant="outline" size="sm" className="gap-2">
                        <ArrowLeft className="h-4 w-4" /> Back to Orders
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Order #{order.order_number}
                    </h1>
                    <p className="text-slate-500 text-sm">{formatDate(order.created_at)}</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Left Column - Main Details */}
                <div className="md:col-span-2 space-y-6">
                    {/* Items */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Package className="h-5 w-5 text-slate-500" />
                                Order Items
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {order.items?.map((item, index) => (
                                    <div key={index} className="flex justify-between items-start border-b pb-4 last:border-0 last:pb-0">
                                        <div>
                                            <p className="font-medium text-slate-900">{item.product_name}</p>
                                            <p className="text-sm text-slate-500">SKU: {item.product_sku}</p>
                                            <p className="text-sm text-slate-600 mt-1">
                                                Qty: {item.quantity} × {formatCurrency(item.unit_price)}
                                            </p>
                                        </div>
                                        <p className="font-medium">{formatCurrency(item.total_price)}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                        <div className="bg-slate-50 p-6 border-t mt-4">
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Subtotal</span>
                                    <span>{formatCurrency(order.subtotal)}</span>
                                </div>
                                {order.discount_amount > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>Discount</span>
                                        <span>-{formatCurrency(order.discount_amount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Shipping</span>
                                    <span>{order.shipping_amount === 0 ? 'Free' : formatCurrency(order.shipping_amount)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Tax</span>
                                    <span>{formatCurrency(order.tax_amount)}</span>
                                </div>
                                <div className="pt-2 mt-2 border-t flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span>{formatCurrency(order.total_amount)}</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Column - Status & Info */}
                <div className="space-y-6">
                    {/* Admin Actions */}
                    <Card className="border-primary/20 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Update Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-slate-500 mb-1 block">Fulfillment Status</label>
                                    <select
                                        value={order.status}
                                        onChange={(e) => handleStatusChange(e.target.value)}
                                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="processing">Processing</option>
                                        <option value="shipped">Shipped</option>
                                        <option value="delivered">Delivered</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Customer & Shipping */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <UserIcon className="h-5 w-5 text-slate-500" />
                                Customer Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-4">
                            <div>
                                <p className="font-medium text-slate-900">{order.customer_name || 'Guest User'}</p>
                                <p className="text-slate-600">{order.customer_email || 'No email provided'}</p>
                                {order.customer_phone && <p className="text-slate-600">{order.customer_phone}</p>}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Truck className="h-5 w-5 text-slate-500" />
                                Shipping & Delivery
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-4">
                            <div>
                                <p className="font-medium text-slate-900 mb-2">Shipping Address</p>
                                {order.shipping_address_data ? (
                                    <div className="text-slate-600 space-y-1">
                                        <p className="font-medium">{order.shipping_address_data.full_name}</p>
                                        <p>{order.shipping_address_data.address_line1}</p>
                                        {order.shipping_address_data.address_line2 && <p>{order.shipping_address_data.address_line2}</p>}
                                        <p>{order.shipping_address_data.city}, {order.shipping_address_data.state} {order.shipping_address_data.postal_code}</p>
                                        <p>{order.shipping_address_data.country}</p>
                                        <p className="mt-2 text-slate-500 flex items-center gap-2">
                                            Phone: {order.shipping_address_data.phone}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-slate-500 italic">No shipping address recorded for this order.</p>
                                )}
                            </div>
                            <div className="pt-4 border-t">
                                <p className="font-medium mb-1 text-slate-500">Shipping Method</p>
                                <p className="text-slate-900">Standard Delivery</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment Info */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-slate-500" />
                                Payment details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-4">
                            <div>
                                <p className="text-slate-500 mb-1">Method</p>
                                <p className="font-medium">
                                    {order.payment_method === 'cod' ? 'Cash on Delivery (COD)' : 'Online Payment'}
                                </p>
                            </div>
                            <div>
                                <p className="text-slate-500 mb-1">Status</p>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    order.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                    {order.payment_status.toUpperCase()}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
