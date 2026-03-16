'use client';

import { useEffect, useState } from 'react';
import { adminApi, DashboardStats, RecentOrder } from '@/lib/api';
import { 
    Users, Package, ShoppingCart, DollarSign, 
    TrendingUp, Clock, AlertTriangle 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Default to empty (All Time for recent orders, Today for stats)
    const [selectedDate, setSelectedDate] = useState<string>('');

    useEffect(() => {
        const fetchDashboardData = async () => {
            setIsLoading(true);
            try {
                const [statsData, ordersData] = await Promise.all([
                    adminApi.getDashboardStats(selectedDate),
                    adminApi.getRecentOrders(5, selectedDate) // Get last 5 orders
                ]);
                setStats(statsData);
                setRecentOrders(ordersData);
            } catch (err: any) {
                console.error("Dashboard error:", err);
                setError(err.message || "Failed to load dashboard data");
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [selectedDate]);

    if (error) {
        return (
            <div className="rounded-md bg-red-50 p-4">
                <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
        );
    }

    const StatCard = ({ title, value, icon: Icon, description }: any) => (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
                <Icon className="h-4 w-4 text-slate-400" />
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
                    <p className="text-slate-500 mt-2">Overview of your store's performance.</p>
                </div>
                <div className="flex items-center gap-2">
                    <label htmlFor="dashboardDate" className="text-sm font-medium text-slate-600">Statistics Date:</label>
                    <input 
                        type="date" 
                        id="dashboardDate"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-3 py-2 border rounded-md text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard 
                    title="Total Revenue" 
                    value={stats ? formatCurrency(stats.total_revenue) : 0} 
                    icon={DollarSign}
                    description="All time paid orders"
                />
                <StatCard 
                    title={selectedDate ? `Orders on ${selectedDate}` : "Orders Today"} 
                    value={stats?.orders_today || 0} 
                    icon={TrendingUp}
                    description={selectedDate ? "For selected date" : "Last 24 hours"}
                />
                <StatCard 
                    title="COD Orders" 
                    value={stats?.cod_orders || 0} 
                    icon={ShoppingCart}
                    description={selectedDate ? "For selected date" : "Last 24 hours"}
                />
                <StatCard 
                    title="Paid / Online Orders" 
                    value={stats?.online_orders || 0} 
                    icon={DollarSign}
                    description={selectedDate ? "For selected date" : "Last 24 hours"}
                />
                <StatCard 
                    title="Pending Orders" 
                    value={stats?.pending_orders || 0} 
                    icon={Clock}
                    description="Needs processing"
                />
                <StatCard 
                    title="Total Customers" 
                    value={stats?.total_users || 0} 
                    icon={Users}
                    description="Registered accounts"
                />
                <StatCard 
                    title="Total Products" 
                    value={stats?.total_products || 0} 
                    icon={Package}
                    description="Active in catalog"
                />
                <StatCard 
                    title="Total Orders" 
                    value={stats?.total_orders || 0} 
                    icon={ShoppingCart}
                    description="All time"
                />
                <StatCard 
                    title="Low Stock Alerts" 
                    value={stats?.low_stock_products || 0} 
                    icon={AlertTriangle}
                    description="Products with stock < 10"
                />
            </div>

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
                                                    <span className="font-medium text-slate-900">{order.customer_name || 'Guest User'}</span>
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
