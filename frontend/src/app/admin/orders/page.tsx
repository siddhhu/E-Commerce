'use client';

import { useEffect, useState } from 'react';
import { adminApi, Order, PaginatedOrders } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';

const STATUS_STYLES: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    processing: 'bg-blue-50 text-blue-700 border-blue-200',
    shipped: 'bg-purple-50 text-purple-700 border-purple-200',
    delivered: 'bg-green-50 text-green-700 border-green-200',
    cancelled: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function AdminOrdersPage() {
    const [ordersData, setOrdersData] = useState<PaginatedOrders | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({ page: 1, page_size: 10, search: '', status: '' });
    const { toast } = useToast();

    const fetchOrders = async () => {
        setIsLoading(true);
        try {
            const data = await adminApi.listOrders(filters);
            setOrdersData(data);
        } catch (error: any) {
            toast({ title: 'Error fetching orders', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const t = setTimeout(() => fetchOrders(), 300);
        return () => clearTimeout(t);
    }, [filters.page, filters.search, filters.status]);

    const handleStatusChange = async (orderId: string, newStatus: string) => {
        try {
            if (newStatus === 'cancelled') {
                await adminApi.cancelOrder(orderId);
                toast({ title: 'Order cancelled and stock restored' });
            } else {
                await adminApi.updateOrderStatus(orderId, newStatus);
                toast({ title: 'Order status updated' });
            }
            fetchOrders();
        } catch (error: any) {
            toast({ title: 'Failed to update status', description: error.message, variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Orders</h1>
                    <p className="text-slate-500 text-sm mt-1">View and fulfill customer orders.</p>
                </div>
            </div>

            <Card>
                <CardHeader className="border-b bg-slate-50/50 p-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                            <Input
                                placeholder="Search by Order ID..."
                                className="pl-9"
                                value={filters.search}
                                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
                            />
                        </div>
                        <select
                            className="flex h-10 items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-w-[140px]"
                            value={filters.status}
                            onChange={(e) => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
                        >
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-8 text-center text-slate-500">Loading orders...</div>
                    ) : !ordersData?.items?.length ? (
                        <div className="p-8 text-center text-slate-500">No orders found.</div>
                    ) : (
                        <>
                            {/* ── Desktop Table ─────────────────────────────────── */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                                        <tr>
                                            <th className="px-6 py-4">Order Details</th>
                                            <th className="px-6 py-4">Status & Payment</th>
                                            <th className="px-6 py-4">Items</th>
                                            <th className="px-6 py-4 text-right">Total</th>
                                            <th className="px-6 py-4 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ordersData.items.map((order) => (
                                            <tr key={order.id} className="bg-white border-b hover:bg-slate-50">
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-semibold text-slate-900">#{order.order_number.substring(0, 8)}</p>
                                                            <p className="text-xs text-slate-500 mt-1">{formatDate(order.created_at)}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-medium text-slate-900">{order.customer_name || 'Guest'}</p>
                                                            <p className="text-xs text-slate-500">{order.customer_email || '—'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="space-y-1.5">
                                                        <select
                                                            value={order.status}
                                                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                            className={`text-xs font-semibold rounded-md border px-2 py-1 ${STATUS_STYLES[order.status] || STATUS_STYLES.cancelled}`}
                                                        >
                                                            <option value="pending">Pending</option>
                                                            <option value="processing">Processing</option>
                                                            <option value="shipped">Shipped</option>
                                                            <option value="delivered">Delivered</option>
                                                            <option value="cancelled">Cancelled</option>
                                                        </select>
                                                        <p className="text-xs text-slate-500">
                                                            {order.payment_method === 'cod' ? '💵 COD' : '💳 Online'} · {order.payment_status}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-xs text-slate-600 truncate max-w-[200px]" title={order.product_summary}>
                                                        {order.product_summary || '—'}
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-0.5">{order.items_count} items</p>
                                                </td>
                                                <td className="px-6 py-4 text-right font-semibold text-slate-900">
                                                    {formatCurrency(order.total_amount)}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <Link href={`/admin/orders/${order.id}`}>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* ── Mobile Card List ───────────────────────────────── */}
                            <div className="md:hidden divide-y divide-slate-100">
                                {ordersData.items.map((order) => (
                                    <div key={order.id} className="p-4 space-y-3">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-bold text-slate-900">#{order.order_number.substring(0, 8)}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{formatDate(order.created_at)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-slate-900">{formatCurrency(order.total_amount)}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{order.items_count} items</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm text-slate-700 font-medium">{order.customer_name || 'Guest User'}</p>
                                            {order.customer_email && (
                                                <p className="text-xs text-slate-400">{order.customer_email}</p>
                                            )}
                                        </div>

                                        {order.product_summary && (
                                            <p className="text-xs text-slate-500 truncate">{order.product_summary}</p>
                                        )}

                                        <div className="flex items-center gap-3 flex-wrap">
                                            <select
                                                value={order.status}
                                                onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                className={`text-xs font-semibold rounded-md border px-2 py-1.5 ${STATUS_STYLES[order.status] || STATUS_STYLES.cancelled}`}
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="processing">Processing</option>
                                                <option value="shipped">Shipped</option>
                                                <option value="delivered">Delivered</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                            <span className="text-xs text-slate-500">
                                                {order.payment_method === 'cod' ? '💵 COD' : '💳 Online'} · {order.payment_status}
                                            </span>
                                            <Link href={`/admin/orders/${order.id}`} className="ml-auto">
                                                <Button variant="outline" size="sm" className="h-8 text-xs">
                                                    <Eye className="h-3.5 w-3.5 mr-1" />
                                                    View
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </CardContent>

                {/* Pagination */}
                {ordersData && ordersData.total > ordersData.page_size && (
                    <div className="flex items-center justify-between px-4 md:px-6 py-4 border-t flex-wrap gap-3">
                        <div className="text-sm text-slate-500">
                            <span className="font-medium">{((filters.page - 1) * filters.page_size) + 1}</span>
                            {' – '}
                            <span className="font-medium">{Math.min(filters.page * filters.page_size, ordersData.total)}</span>
                            {' of '}
                            <span className="font-medium">{ordersData.total}</span>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline" size="sm"
                                onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                                disabled={filters.page === 1}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                            </Button>
                            <Button
                                variant="outline" size="sm"
                                onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                                disabled={filters.page * filters.page_size >= ordersData.total}
                            >
                                Next <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
