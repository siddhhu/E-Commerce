'use client';

import { useEffect, useState } from 'react';
import { adminApi, DashboardStats, RecentOrder, authApi } from '@/lib/api';
import { 
    Users, Package, ShoppingCart, DollarSign, 
    TrendingUp, Clock, AlertTriangle, KeyRound, Eye, EyeOff, CheckCircle2, Mail, Phone
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth-store';

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Default to empty (All Time for recent orders, Today for stats)
    const [selectedDate, setSelectedDate] = useState<string>('');
    const { user } = useAuthStore();
    const role = (user?.role || '').toString().toLowerCase();
    const isSellerOnly = role !== 'admin' && role !== 'super_admin' && user?.seller_status === 'approved' && user?.user_type === 'seller';

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

            {isSellerOnly && (
                <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-pink-50">
                    <CardContent className="p-5">
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                            <div className="min-w-0">
                                <h2 className="mt-1 text-xl font-extrabold text-slate-900">Mahaganpati</h2>
                                <p className="mt-1 text-sm font-semibold text-slate-600">GSTIN: 10ACEFM4547Q1C9</p>
                                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Your seller account is registered under Mahaganpati. Feel free to reach out for approvals, GST/account updates, payouts, or urgent order issues.</p>
                            </div>
                            <div className="grid min-w-0 gap-2 text-sm font-semibold text-slate-700 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                                <a href="mailto:support@pranjay.com" className="inline-flex min-w-0 items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm ring-1 ring-pink-100 hover:text-primary">
                                    <Mail className="h-4 w-4 shrink-0 text-primary" />
                                    <span className="min-w-0 break-all">support@pranjay.com</span>
                                </a>
                                <a href="tel:+917870053331" className="inline-flex min-w-0 items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm ring-1 ring-pink-100 hover:text-primary">
                                    <Phone className="h-4 w-4 shrink-0 text-primary" />
                                    <span className="min-w-0 whitespace-nowrap">+91 78700 53331</span>
                                </a>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

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

            {/* ── Change Password ───────────────────────────────────────────── */}
            <ChangePasswordCard />
        </div>
    );
}


// ── Self-contained inline change password card ────────────────────────────────
function ChangePasswordCard() {
    const { toast } = useToast();
    const [form, setForm] = useState({ current: '', next: '', confirm: '' });
    const [show, setShow] = useState({ current: false, next: false, confirm: false });
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const field = (key: 'current' | 'next' | 'confirm') => ({
        value: form[key],
        type: show[key] ? 'text' : 'password',
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
            setForm(f => ({ ...f, [key]: e.target.value }));
            setErrors(er => ({ ...er, [key]: '' }));
            setSuccess(false);
        },
        toggle: () => setShow(s => ({ ...s, [key]: !s[key] })),
        showIcon: show[key],
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs: Record<string, string> = {};
        if (!form.current) errs.current = 'Required.';
        if (!form.next) errs.next = 'Required.';
        else if (form.next.length < 8) errs.next = 'At least 8 characters.';
        if (form.next !== form.confirm) errs.confirm = 'Passwords do not match.';
        if (form.current && form.current === form.next) errs.next = 'Must differ from current.';
        if (Object.keys(errs).length) { setErrors(errs); return; }

        setIsLoading(true);
        try {
            await authApi.changePassword({ current_password: form.current, new_password: form.next });
            setSuccess(true);
            setForm({ current: '', next: '', confirm: '' });
            toast({ title: '✅ Password Updated', description: 'Your password has been changed successfully.' });
        } catch (err: any) {
            const msg = err.message || 'Failed to update password.';
            toast({ title: 'Error', description: msg, variant: 'destructive' });
            if (msg.toLowerCase().includes('incorrect')) setErrors({ current: 'Current password is incorrect.' });
        } finally {
            setIsLoading(false);
        }
    };

    const strength = (() => {
        const p = form.next;
        if (!p) return { score: 0, label: '', color: '' };
        let s = 0;
        if (p.length >= 8) s++; if (p.length >= 12) s++;
        if (/[A-Z]/.test(p)) s++; if (/[0-9]/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
        return s <= 1 ? { score: s, label: 'Weak', color: 'bg-red-500' }
            : s <= 3 ? { score: s, label: 'Fair', color: 'bg-amber-500' }
            : s === 4 ? { score: s, label: 'Strong', color: 'bg-blue-500' }
            : { score: s, label: 'Very Strong', color: 'bg-green-500' };
    })();

    const pw = field('current'), pn = field('next'), pc = field('confirm');

    return (
        <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center gap-3 pb-4">
                <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0">
                    <KeyRound className="h-4 w-4 text-white" />
                </div>
                <div>
                    <CardTitle className="text-base">Change Password</CardTitle>
                    <p className="text-xs text-slate-500 font-normal">Update your account password.</p>
                </div>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
                    {success && (
                        <div className="sm:col-span-3 flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
                            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                            Password updated successfully!
                        </div>
                    )}

                    {/* Current */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Current Password</label>
                        <div className="relative">
                            <input id="cp-current" {...{type: pw.type, value: pw.value, onChange: pw.onChange}}
                                placeholder="Current password"
                                className={`w-full pr-9 pl-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 transition-colors ${
                                    errors.current ? 'border-red-400 focus:ring-red-100 bg-red-50' : 'border-slate-300 focus:ring-slate-200'
                                }`} />
                            <button type="button" onClick={pw.toggle} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                {pw.showIcon ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                        </div>
                        {errors.current && <p className="text-xs text-red-600">{errors.current}</p>}
                    </div>

                    {/* New */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">New Password</label>
                        <div className="relative">
                            <input id="cp-new" {...{type: pn.type, value: pn.value, onChange: pn.onChange}}
                                placeholder="Min. 8 characters"
                                className={`w-full pr-9 pl-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 transition-colors ${
                                    errors.next ? 'border-red-400 focus:ring-red-100 bg-red-50' : 'border-slate-300 focus:ring-slate-200'
                                }`} />
                            <button type="button" onClick={pn.toggle} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                {pn.showIcon ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                        </div>
                        {form.next && (
                            <div className="flex gap-1 pt-0.5">
                                {[1,2,3,4,5].map(i => <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength.score ? strength.color : 'bg-slate-200'}`} />)}
                            </div>
                        )}
                        {errors.next && <p className="text-xs text-red-600">{errors.next}</p>}
                    </div>

                    {/* Confirm */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Confirm New Password</label>
                        <div className="relative">
                            <input id="cp-confirm" {...{type: pc.type, value: pc.value, onChange: pc.onChange}}
                                placeholder="Re-enter new password"
                                className={`w-full pr-9 pl-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 transition-colors ${
                                    errors.confirm ? 'border-red-400 focus:ring-red-100 bg-red-50'
                                    : form.confirm && form.confirm === form.next ? 'border-green-400 focus:ring-green-100 bg-green-50'
                                    : 'border-slate-300 focus:ring-slate-200'
                                }`} />
                            <button type="button" onClick={pc.toggle} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                {pc.showIcon ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                        </div>
                        {errors.confirm && <p className="text-xs text-red-600">{errors.confirm}</p>}
                    </div>

                    <div className="sm:col-span-3 flex justify-end">
                        <button type="submit" id="cp-submit" disabled={isLoading}
                            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                            {isLoading
                                ? <><div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Updating...</>
                                : <><KeyRound className="h-3.5 w-3.5" /> Update Password</>}
                        </button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
