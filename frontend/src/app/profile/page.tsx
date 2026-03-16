'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Package, MapPin, Phone, Mail, Calendar, Settings, ChevronRight, LogOut } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuthStore } from '@/store/auth-store';
import { useOrderStore } from '@/store/order-store';
import { ordersApi, Order } from '@/lib/api';
import { formatDate, formatPrice } from '@/lib/utils';

export default function ProfilePage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: isAuthLoading, logout, _hasHydrated } = useAuthStore();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoadingOrders, setIsLoadingOrders] = useState(false);

    useEffect(() => {
        if (_hasHydrated && !isAuthLoading && !isAuthenticated) {
            router.push('/login?redirect=/profile');
            return;
        }

        if (isAuthenticated) {
            const fetchRecentOrders = async () => {
                setIsLoadingOrders(true);
                try {
                    const data = await ordersApi.list();
                    setOrders(data.items.slice(0, 3)); // Show only 3 recent orders
                } catch (error) {
                    console.error('Failed to fetch orders:', error);
                } finally {
                    setIsLoadingOrders(false);
                }
            };
            fetchRecentOrders();
        }
    }, [isAuthenticated, isAuthLoading, _hasHydrated, router]);

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    if (isAuthLoading || !_hasHydrated) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </main>
                <Footer />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <Header />

            <main className="flex-1 py-10">
                <div className="container max-w-5xl">
                    <h1 className="text-3xl font-bold mb-8 text-slate-900">My Account</h1>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Sidebar / Profile Card */}
                        <div className="space-y-6">
                            <Card className="overflow-hidden">
                                <div className="h-24 bg-gradient-to-r from-primary to-pink-500" />
                                <CardContent className="relative pt-12 pb-6 text-center">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 p-1 bg-white rounded-full shadow-lg">
                                        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center border text-primary">
                                            <User className="h-10 w-10" />
                                        </div>
                                    </div>
                                    <h2 className="text-xl font-bold">{user.full_name || 'Customer'}</h2>
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                    
                                    <div className="mt-6 pt-6 border-t flex flex-col gap-2">
                                        <Button variant="outline" className="w-full justify-start gap-2" onClick={() => router.push('/orders')}>
                                            <Package className="h-4 w-4" /> My Orders
                                        </Button>
                                        <Button variant="outline" className="w-full justify-start gap-2" disabled>
                                            <Settings className="h-4 w-4" /> Account Settings
                                        </Button>
                                        <Button variant="ghost" className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleLogout}>
                                            <LogOut className="h-4 w-4" /> Logout
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Contact Info</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-100 rounded-full">
                                            <Mail className="h-4 w-4 text-slate-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Email</p>
                                            <p className="text-sm font-medium">{user.email}</p>
                                        </div>
                                    </div>
                                    {user.phone && (
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 rounded-full">
                                                <Phone className="h-4 w-4 text-slate-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Phone</p>
                                                <p className="text-sm font-medium">{user.phone}</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-100 rounded-full">
                                            <Calendar className="h-4 w-4 text-slate-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Member Since</p>
                                            <p className="text-sm font-medium">{formatDate(new Date().toISOString())}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Main Content */}
                        <div className="md:col-span-2 space-y-6">
                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                                                <p className="text-2xl font-bold mt-1">{orders.length}</p>
                                            </div>
                                            <div className="p-3 bg-blue-50 rounded-xl">
                                                <Package className="h-6 w-6 text-blue-600" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">Favorite Category</p>
                                                <p className="text-2xl font-bold mt-1">Cosmetics</p>
                                            </div>
                                            <div className="p-3 bg-pink-50 rounded-xl">
                                                <User className="h-6 w-6 text-pink-600" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Recent Orders */}
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div>
                                        <CardTitle className="text-xl">Recent Orders</CardTitle>
                                        <CardDescription>Your latest purchases</CardDescription>
                                    </div>
                                    <Link href="/orders" className="text-sm text-primary font-medium hover:underline">
                                        View all
                                    </Link>
                                </CardHeader>
                                <CardContent>
                                    {isLoadingOrders ? (
                                        <div className="space-y-4 py-4">
                                            {[1, 2].map((i) => (
                                                <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
                                            ))}
                                        </div>
                                    ) : orders.length > 0 ? (
                                        <div className="divide-y">
                                            {orders.map((order) => (
                                                <Link 
                                                    key={order.id} 
                                                    href={`/orders/${order.id}`}
                                                    className="flex items-center justify-between py-4 hover:bg-slate-50 transition-colors group px-2 rounded-lg"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-2 bg-white border rounded-lg shadow-sm">
                                                            <Package className="h-5 w-5 text-slate-600" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-slate-900">{order.order_number}</p>
                                                            <p className="text-xs text-muted-foreground">{formatDate(order.created_at)} • {order.items.length} items</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right hidden sm:block">
                                                            <p className="font-bold text-slate-900">{formatPrice(order.total_amount)}</p>
                                                            <p className="text-[10px] uppercase font-bold text-green-600">{order.status}</p>
                                                        </div>
                                                        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors" />
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 space-y-3">
                                            <Package className="h-12 w-12 text-slate-200 mx-auto" />
                                            <p className="text-slate-500">You haven't placed any orders yet.</p>
                                            <Link href="/products">
                                                <Button variant="outline" size="sm">Start Shopping</Button>
                                            </Link>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Address Book Placeholder */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-xl">Default Shipping Address</CardTitle>
                                            <CardDescription>Where we send your items</CardDescription>
                                        </div>
                                        <MapPin className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="p-4 border border-dashed rounded-lg bg-white/50 text-center">
                                        <p className="text-sm text-muted-foreground">Addresses are currently managed at checkout.</p>
                                    </div>
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
