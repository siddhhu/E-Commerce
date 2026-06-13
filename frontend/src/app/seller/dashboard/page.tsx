'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { adminApi } from '@/lib/api';
import {
    Package, ShoppingCart, DollarSign, TrendingUp,
    Clock, Store, AlertTriangle, CheckCircle2, Copy
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function SellerDashboardPage() {
    const { user } = useAuthStore();
    const { toast } = useToast();
    const [stats, setStats] = useState<any>(null);
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // For now, sellers see aggregate store stats
                // In future, this will be scoped to seller's products/orders
                const [statsData, ordersData] = await Promise.all([
                    adminApi.getDashboardStats(''),
                    adminApi.getRecentOrders(5, ''),
                ]);
                setStats(statsData);
                setRecentOrders(ordersData);
            } catch (err: any) {
                console.error('Seller dashboard error:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const copyLoginEmail = () => {
        if (user?.seller_username) {
            navigator.clipboard.writeText(user.seller_username);
            toast({ title: 'Copied!', description: 'Seller login email copied to clipboard.' });
        }
    };

    const StatCard = ({ title, value, icon: Icon, description, color = 'slate' }: any) => (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
                <Icon className={`h-4 w-4 text-${color}-400`} />
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-7 w-20" />
                ) : (
                    <div className="text-2xl font-bold">{value}</div>
                )}
                <p className="text-xs text-slate-500 mt-1">{description}</p>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <Store className="h-8 w-8 text-primary" />
                        Seller Dashboard
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Welcome back, <strong>{user?.business_name || user?.full_name || 'Seller'}</strong>
                    </p>
                </div>

                {/* Seller account info card */}
                <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-sm flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-semibold text-green-800">✅ Approved Seller Account</p>
                        {user?.seller_username && (
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-semibold text-green-700">Login email:</span>
                                <span className="text-green-700 font-mono text-xs">{user.seller_username}</span>
                                <button onClick={copyLoginEmail} title="Copy login email">
                                    <Copy className="h-3.5 w-3.5 text-green-500 hover:text-green-700 cursor-pointer" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Seller Info Banner — Coming Soon notice */}
            <div className="rounded-xl bg-gradient-to-r from-primary/10 to-pink-500/10 border border-primary/20 p-5 flex gap-4 items-start">
                <TrendingUp className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                <div>
                    <p className="font-semibold text-slate-800">Your Seller Store is Active 🎉</p>
                    <p className="text-sm text-slate-600 mt-1">
                        You can now list products and manage your orders from this dashboard.
                        Currently showing store-wide stats — seller-specific analytics are being set up.
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Revenue"
                    value={stats ? formatCurrency(stats.total_revenue) : '—'}
                    icon={DollarSign}
                    description="All time paid orders"
                />
                <StatCard
                    title="Orders Today"
                    value={stats?.orders_today ?? '—'}
                    icon={TrendingUp}
                    description="Last 24 hours"
                />
                <StatCard
                    title="Pending Orders"
                    value={stats?.pending_orders ?? '—'}
                    icon={Clock}
                    description="Needs processing"
                    color="amber"
                />
                <StatCard
                    title="Total Products"
                    value={stats?.total_products ?? '—'}
                    icon={Package}
                    description="Active in catalog"
                />
                <StatCard
                    title="COD Orders"
                    value={stats?.cod_orders ?? '—'}
                    icon={ShoppingCart}
                    description="Cash on delivery"
                />
                <StatCard
                    title="Online Orders"
                    value={stats?.online_orders ?? '—'}
                    icon={DollarSign}
                    description="Paid / Prepaid"
                />
                <StatCard
                    title="Total Orders"
                    value={stats?.total_orders ?? '—'}
                    icon={ShoppingCart}
                    description="All time"
                />
                <StatCard
                    title="Low Stock Alerts"
                    value={stats?.low_stock_products ?? '—'}
                    icon={AlertTriangle}
                    description="Products with stock < 10"
                    color="red"
                />
            </div>

            {/* Recent Orders */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Orders</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : recentOrders.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-t border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3">Order</th>
                                        <th className="px-6 py-3">Customer</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3 text-right">Amount</th>
                                        <th className="px-6 py-3 text-right">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentOrders.map((order) => (
                                        <tr key={order.order_number} className="bg-white border-b hover:bg-slate-50">
                                            <td className="px-6 py-4 font-medium text-slate-900">
                                                #{order.order_number.substring(0, 8)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-900">{order.customer_name || 'Guest'}</span>
                                                    <span className="text-xs text-slate-500">{order.customer_email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 text-xs rounded-full ${
                                                    order.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                                    order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                                    order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                                                    order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">{formatCurrency(order.total_amount)}</td>
                                            <td className="px-6 py-4 text-right text-slate-500 whitespace-nowrap">
                                                {formatDate(order.created_at)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-slate-500 text-center py-4">No recent orders found.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
