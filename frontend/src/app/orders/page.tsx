'use client';

import Link from 'next/link';
import { Package, ArrowRight, ShoppingBag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useOrderStore } from '@/store/order-store';
import { formatPrice, formatDate } from '@/lib/utils';

export default function OrdersPage() {
    const { orders } = useOrderStore();

    if (orders.length === 0) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h1 className="text-2xl font-bold">No Orders Yet</h1>
                        <p className="text-muted-foreground mt-2">Start shopping to see your orders here!</p>
                        <Link href="/products">
                            <Button className="mt-6">
                                <ShoppingBag className="h-4 w-4 mr-2" />
                                Browse Products
                            </Button>
                        </Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'bg-blue-100 text-blue-700';
            case 'processing':
                return 'bg-amber-100 text-amber-700';
            case 'shipped':
                return 'bg-purple-100 text-purple-700';
            case 'delivered':
                return 'bg-green-100 text-green-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 py-8">
                <div className="container max-w-4xl">
                    <h1 className="text-3xl font-bold mb-8">My Orders</h1>

                    <div className="space-y-4">
                        {orders.map((order) => (
                            <Card key={order.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-semibold text-lg">{order.order_number}</h3>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
                                                    {order.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                Placed on {formatDate(order.created_at)}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {order.items.length} item(s) • {order.payment_method}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-sm text-muted-foreground">Total</p>
                                                <p className="text-xl font-bold text-primary">
                                                    {formatPrice(order.total_amount)}
                                                </p>
                                            </div>
                                            <Link href={`/orders/${order.id}`}>
                                                <Button variant="outline">
                                                    View Details
                                                    <ArrowRight className="h-4 w-4 ml-2" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
