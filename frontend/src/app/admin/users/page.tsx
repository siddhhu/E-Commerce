'use client';

import { useEffect, useState } from 'react';
import { adminApi, User, SellerCredentials } from '@/lib/api';
import {
    Search, ShieldCheck, XCircle, Building2, FileText, Mail, Phone, Calendar,
    Store, Clock, CheckCircle2, Copy, Eye, EyeOff, Landmark
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

type Tab = 'all' | 'seller-applications';

export default function AdminUsersPage() {
    const [tab, setTab] = useState<Tab>('all');

    // All users state
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
    const [selected, setSelected] = useState<User | null>(null);

    // Seller applications state
    const [pendingSellers, setPendingSellers] = useState<User[]>([]);
    const [isLoadingPending, setIsLoadingPending] = useState(false);
    const [approvedCredentials, setApprovedCredentials] = useState<Record<string, SellerCredentials>>({});
    const [showPasswordFor, setShowPasswordFor] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => { if (tab === 'all') fetchUsers(); }, [pagination.page, typeFilter, tab]);
    useEffect(() => { if (tab === 'seller-applications') fetchPendingSellers(); }, [tab]);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const data = await adminApi.listUsers({ page: pagination.page });
            setUsers(data.items);
            setPagination(prev => ({ ...prev, total: data.total, pages: Math.ceil(data.total / 20) }));
        } catch (err: any) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPendingSellers = async () => {
        setIsLoadingPending(true);
        try {
            const data = await adminApi.listPendingSellers();
            setPendingSellers(data);
        } catch (err: any) {
            console.error(err);
        } finally {
            setIsLoadingPending(false);
        }
    };

    const handleVerify = async (userId: string, isVerified: boolean) => {
        try {
            const updated = await adminApi.verifyUser(userId, isVerified);
            setUsers(users.map(u => u.id === userId ? updated : u));
            if (selected?.id === userId) setSelected(updated);
        } catch (err: any) {
            alert(err.message || 'Failed to update verification status');
        }
    };

    const applySellerCredentials = (user: User, creds: SellerCredentials): User => ({
        ...user,
        is_verified: true,
        seller_status: creds.seller_status as User['seller_status'],
        seller_username: creds.seller_username,
        seller_plain_password: creds.seller_plain_password,
        business_name: creds.business_name ?? user.business_name,
        full_name: creds.full_name ?? user.full_name,
    });

    const handleApproveSeller = async (userId: string) => {
        setActionLoading(userId);
        try {
            const creds = await adminApi.approveSeller(userId);
            const existingSeller = users.find(u => u.id === userId) || pendingSellers.find(u => u.id === userId);
            setApprovedCredentials(prev => ({ ...prev, [userId]: creds }));
            // Remove from pending list
            setPendingSellers(prev => prev.filter(u => u.id !== userId));
            setUsers(prev => prev.map(u => u.id === userId ? applySellerCredentials(u, creds) : u));
            setSelected(prev => {
                if (prev?.id === userId) return applySellerCredentials(prev, creds);
                return existingSeller ? applySellerCredentials(existingSeller, creds) : prev;
            });
        } catch (err: any) {
            alert(err.message || 'Failed to approve seller');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectSeller = async (userId: string) => {
        if (!confirm('Are you sure you want to reject this seller application?')) return;
        setActionLoading(userId);
        try {
            await adminApi.rejectSeller(userId);
            setPendingSellers(prev => prev.filter(u => u.id !== userId));
        } catch (err: any) {
            alert(err.message || 'Failed to reject seller');
        } finally {
            setActionLoading(null);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            alert('Copied to clipboard!');
        });
    };

    const filtered = users.filter(u => {
        const matchSearch = u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
            (u.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
            (u.phone?.includes(searchTerm) ?? false);
        const matchType = typeFilter === '' || u.user_type === typeFilter;
        return matchSearch && matchType;
    });

    const sellerHasCredentials = (user: User) => !!user.seller_username && !!user.seller_plain_password;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">User Management</h1>
                <p className="text-slate-500 mt-1">View registrations, account details and manage seller approvals.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b">
                <button
                    onClick={() => setTab('all')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        tab === 'all'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    All Users
                </button>
                <button
                    onClick={() => setTab('seller-applications')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                        tab === 'seller-applications'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Store className="h-4 w-4" />
                    Seller Applications
                    {pendingSellers.length > 0 && tab !== 'seller-applications' && (
                        <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {pendingSellers.length}
                        </span>
                    )}
                </button>
            </div>

            {/* ── Seller Applications Tab ──────────────────────────────────── */}
            {tab === 'seller-applications' && (
                <div className="space-y-4">
                    {isLoadingPending ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
                        </div>
                    ) : pendingSellers.length === 0 && Object.keys(approvedCredentials).length === 0 ? (
                        <Card>
                            <CardContent className="py-16 text-center text-slate-400">
                                <Store className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                <p className="font-medium">No pending seller applications</p>
                                <p className="text-sm mt-1">New applications will appear here</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            {/* Pending sellers */}
                            {pendingSellers.map(seller => (
                                <Card key={seller.id} className="border-amber-200 bg-amber-50/30">
                                    <CardContent className="pt-5">
                                        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-amber-500" />
                                                    <span className="font-semibold text-slate-900">
                                                        {seller.business_name || seller.full_name || seller.email}
                                                    </span>
                                                    <Badge variant="warning" className="text-[10px]">PENDING</Badge>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-slate-600 mt-2">
                                                    <div className="flex items-center gap-1">
                                                        <Mail className="h-3 w-3" /> {seller.email}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Phone className="h-3 w-3" /> {seller.phone || '—'}
                                                    </div>
                                                    {seller.gst_number && (
                                                        <div className="flex items-center gap-1 font-mono text-xs">
                                                            <FileText className="h-3 w-3" /> GST: {seller.gst_number}
                                                        </div>
                                                    )}
                                                    {seller.seller_invoice_url && (
                                                        <div>
                                                            <a
                                                                href={seller.seller_invoice_url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-primary underline text-xs font-medium"
                                                            >
                                                                📄 View Registration Document
                                                            </a>
                                                        </div>
                                                    )}
                                                    {seller.seller_bank_proof_url && (
                                                        <div>
                                                            <a
                                                                href={seller.seller_bank_proof_url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-primary underline text-xs font-medium"
                                                            >
                                                                View Bank Proof
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                                                    <div className="rounded-lg border border-amber-200 bg-white/80 p-3 text-xs">
                                                        <div className="flex items-center gap-2 font-bold uppercase tracking-wide text-amber-700">
                                                            <FileText className="h-3.5 w-3.5" />
                                                            GST Review
                                                        </div>
                                                        <p className="mt-2 text-slate-700">
                                                            Business: <span className="font-semibold">{seller.business_name || '—'}</span>
                                                        </p>
                                                        <p className="mt-1 font-mono text-slate-700">
                                                            GST: {seller.gst_number || 'Not provided'}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-lg border border-blue-100 bg-white/80 p-3 text-xs">
                                                        <div className="flex items-center gap-2 font-bold uppercase tracking-wide text-blue-700">
                                                            <Landmark className="h-3.5 w-3.5" />
                                                            Bank Verification
                                                        </div>
                                                        <p className="mt-2 text-slate-700">
                                                            Holder: <span className="font-semibold">{seller.bank_account_holder_name || '—'}</span>
                                                        </p>
                                                        <p className="mt-1 font-mono text-slate-700">
                                                            A/C: {seller.bank_account_number || 'Not provided'}
                                                        </p>
                                                        <p className="mt-1 font-mono text-slate-700">
                                                            IFSC: {seller.bank_ifsc || 'Not provided'}
                                                        </p>
                                                        {seller.bank_name && (
                                                            <p className="mt-1 text-slate-700">Bank: {seller.bank_name}</p>
                                                        )}
                                                        {seller.seller_bank_proof_url ? (
                                                            <a
                                                                href={seller.seller_bank_proof_url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="mt-2 inline-flex text-primary underline"
                                                            >
                                                                Open uploaded bank proof
                                                            </a>
                                                        ) : (
                                                            <p className="mt-2 text-red-600">Bank proof not uploaded</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    Applied: {formatDate(seller.updated_at)}
                                                </p>
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                <Button
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700"
                                                    disabled={actionLoading === seller.id}
                                                    onClick={() => handleApproveSeller(seller.id)}
                                                >
                                                    <ShieldCheck className="h-4 w-4 mr-1" />
                                                    {actionLoading === seller.id ? 'Approving...' : 'Approve'}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                                    disabled={actionLoading === seller.id}
                                                    onClick={() => handleRejectSeller(seller.id)}
                                                >
                                                    <XCircle className="h-4 w-4 mr-1" /> Reject
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            {/* Approved sellers with credentials */}
                            {Object.entries(approvedCredentials).map(([userId, creds]) => (
                                <Card key={userId} className="border-green-200 bg-green-50/30">
                                    <CardContent className="pt-5">
                                        <div className="flex items-start gap-2 mb-3">
                                            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-semibold text-green-800">
                                                    ✅ {creds.business_name || creds.full_name || 'Seller'} — Approved!
                                                </p>
                                                <p className="text-xs text-green-600 mt-0.5">
                                                    Share these credentials with the seller manually. They need them to log in at /seller-login
                                                </p>
                                            </div>
                                        </div>
                                        <div className="bg-white border border-green-200 rounded-lg p-4 space-y-3">
                                            <div>
                                                <p className="text-xs font-bold uppercase text-slate-400 mb-1">Seller Username (email)</p>
                                                <div className="flex items-center gap-2">
                                                    <code className="text-sm font-mono bg-slate-100 px-2 py-1 rounded flex-1">
                                                        {creds.seller_username}
                                                    </code>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 w-7 p-0"
                                                        onClick={() => copyToClipboard(creds.seller_username)}
                                                    >
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold uppercase text-slate-400 mb-1">Password</p>
                                                <div className="flex items-center gap-2">
                                                    <code className="text-sm font-mono bg-slate-100 px-2 py-1 rounded flex-1">
                                                        {showPasswordFor === userId ? creds.seller_plain_password : '••••••••••••'}
                                                    </code>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 w-7 p-0"
                                                        onClick={() => setShowPasswordFor(showPasswordFor === userId ? null : userId)}
                                                    >
                                                        {showPasswordFor === userId ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 w-7 p-0"
                                                        onClick={() => copyToClipboard(creds.seller_plain_password)}
                                                    >
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-500 bg-amber-50 border border-amber-100 rounded p-2">
                                                ⚠️ Share these credentials with the seller via phone or WhatsApp. They can log in at{' '}
                                                <strong>/seller-login</strong>.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </>
                    )}
                </div>
            )}

            {/* ── All Users Tab ────────────────────────────────────────────── */}
            {tab === 'all' && (
                <>
                    {/* Detail Panel */}
                    {selected && (
                        <Card className="border-2 border-primary/20 bg-primary/5">
                            <CardContent className="pt-5 pb-4">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900">{selected.full_name || 'No Name'}</h2>
                                        <p className="text-sm text-slate-500">{selected.email}</p>
                                    </div>
                                    <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700 text-xl font-bold">&times;</button>
                                </div>
                                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Phone</p>
                                        <p className="font-medium mt-0.5">{selected.phone || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Account Type</p>
                                        <Badge variant={selected.user_type === 'seller' ? 'secondary' : 'outline'} className="mt-0.5">
                                            {selected.user_type}
                                        </Badge>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Role</p>
                                        <p className="font-medium mt-0.5 capitalize">{selected.role?.replace(/_/g, ' ').toLowerCase()}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Business Name</p>
                                        <p className="font-medium mt-0.5">{selected.business_name || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">GST Number</p>
                                        <p className="font-mono font-medium mt-0.5">{selected.gst_number || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Registered On</p>
                                        <p className="font-medium mt-0.5">{formatDate(selected.created_at)}</p>
                                    </div>
                                    {selected.user_type === 'seller' && (
                                        <>
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Seller Status</p>
                                                <Badge
                                                    variant={
                                                        selected.seller_status === 'approved' ? 'success' :
                                                        selected.seller_status === 'pending' ? 'warning' :
                                                        selected.seller_status === 'rejected' ? 'destructive' : 'outline'
                                                    }
                                                    className="mt-0.5"
                                                >
                                                    {selected.seller_status || 'none'}
                                                </Badge>
                                            </div>
                                            {selected.seller_username && (
                                                <div className="space-y-3">
                                                    <div>
                                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Seller Username</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <code className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">
                                                                {selected.seller_username}
                                                            </code>
                                                            <Button
                                                                size="sm" variant="ghost" className="h-6 w-6 p-0"
                                                                onClick={() => copyToClipboard(selected.seller_username!)}
                                                            >
                                                                <Copy className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    {selected.seller_plain_password && (
                                                        <div>
                                                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Seller Password</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <code className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">
                                                                    {showPasswordFor === selected.id ? selected.seller_plain_password : '••••••••••••'}
                                                                </code>
                                                                <Button
                                                                    size="sm" variant="ghost" className="h-6 w-6 p-0"
                                                                    onClick={() => setShowPasswordFor(showPasswordFor === selected.id ? null : selected.id)}
                                                                >
                                                                    {showPasswordFor === selected.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                                                </Button>
                                                                <Button
                                                                    size="sm" variant="ghost" className="h-6 w-6 p-0"
                                                                    onClick={() => copyToClipboard(selected.seller_plain_password!)}
                                                                >
                                                                    <Copy className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {selected.seller_invoice_url && (
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Invoice</p>
                                                    <a href={selected.seller_invoice_url} target="_blank" rel="noreferrer" className="text-primary underline text-xs">
                                                        View document
                                                    </a>
                                                </div>
                                            )}
                                            {selected.seller_bank_proof_url && (
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Bank Proof</p>
                                                    <a href={selected.seller_bank_proof_url} target="_blank" rel="noreferrer" className="text-primary underline text-xs">
                                                        View bank proof
                                                    </a>
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Account Holder</p>
                                                <p className="font-medium mt-0.5">{selected.bank_account_holder_name || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Bank Account</p>
                                                <p className="font-mono font-medium mt-0.5">{selected.bank_account_number || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">IFSC</p>
                                                <p className="font-mono font-medium mt-0.5">{selected.bank_ifsc || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Bank Name</p>
                                                <p className="font-medium mt-0.5">{selected.bank_name || '—'}</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                                {selected.user_type === 'seller' && (
                                    <div className="mt-4 pt-4 border-t flex gap-3">
                                        {selected.seller_status !== 'approved' || !sellerHasCredentials(selected) ? (
                                            <Button
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-700"
                                                disabled={actionLoading === selected.id}
                                                onClick={() => handleApproveSeller(selected.id)}
                                            >
                                                <ShieldCheck className="h-4 w-4 mr-1" />
                                                {actionLoading === selected.id ? 'Approving...' : selected.seller_status === 'approved' ? 'Generate Credentials' : 'Approve Seller'}
                                            </Button>
                                        ) : (
                                            <Button size="sm" variant="outline" className="text-amber-600 border-amber-300" onClick={() => handleVerify(selected.id, false)}>
                                                <XCircle className="h-4 w-4 mr-1" /> Revoke Verification
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader className="pb-3 border-b">
                            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                                <div className="relative w-full md:w-96">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by name, email, phone, or business..."
                                        className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-primary/50 outline-none text-sm"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <select
                                    className="px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                >
                                    <option value="">All Types</option>
                                    <option value="seller">Wholesale Only</option>
                                    <option value="customer">B2C Only</option>
                                </select>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="p-6 space-y-4">
                                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-5 py-3">User</th>
                                                <th className="px-5 py-3">Contact</th>
                                                <th className="px-5 py-3">Business / GST</th>
                                                <th className="px-5 py-3">Type</th>
                                                <th className="px-5 py-3">Registered</th>
                                                <th className="px-5 py-3">Status</th>
                                                <th className="px-5 py-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filtered.length > 0 ? filtered.map((user) => (
                                                <tr
                                                    key={user.id}
                                                    className={`border-b hover:bg-slate-50 transition-colors cursor-pointer ${selected?.id === user.id ? 'bg-primary/5' : ''}`}
                                                    onClick={() => setSelected(selected?.id === user.id ? null : user)}
                                                >
                                                    <td className="px-5 py-3">
                                                        <p className="font-semibold text-slate-900">{user.full_name || <span className="italic text-slate-400">No Name</span>}</p>
                                                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                            <Mail className="h-3 w-3" />{user.email}
                                                        </p>
                                                    </td>
                                                    <td className="px-5 py-3 text-slate-600">
                                                        {user.phone ? (
                                                            <span className="flex items-center gap-1 text-xs"><Phone className="h-3 w-3" />{user.phone}</span>
                                                        ) : (
                                                            <span className="text-slate-300 text-xs italic">N/A</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        {user.user_type === 'seller' ? (
                                                            <div className="space-y-0.5">
                                                                <div className="flex items-center gap-1 text-slate-700 text-xs font-medium">
                                                                    <Building2 className="h-3 w-3" />{user.business_name || <span className="italic text-slate-400">Not set</span>}
                                                                </div>
                                                                {user.gst_number && (
                                                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                                                        <FileText className="h-3 w-3" /><span className="font-mono">{user.gst_number}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : <span className="text-slate-300 text-xs italic">—</span>}
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <Badge variant={user.user_type === 'seller' ? 'secondary' : 'outline'} className="text-[10px]">
                                                            {user.user_type}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-1 text-xs text-slate-500">
                                                            <Calendar className="h-3 w-3" />{formatDate(user.created_at)}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className={`h-1.5 w-1.5 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                                                                <span className="text-xs">{user.is_active ? 'Active' : 'Inactive'}</span>
                                                            </div>
                                                            {user.user_type === 'seller' && (
                                                                <Badge
                                                                    variant={
                                                                        user.seller_status === 'approved' ? 'success' :
                                                                        user.seller_status === 'pending' ? 'warning' : 'outline'
                                                                    }
                                                                    className="text-[9px] w-fit"
                                                                >
                                                                    {(user.seller_status || 'NONE').toUpperCase()}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                                        {user.user_type === 'seller' && (user.seller_status !== 'approved' || !sellerHasCredentials(user)) && (
                                                            <Button
                                                                size="sm"
                                                                className="bg-green-600 hover:bg-green-700 h-7 text-xs"
                                                                disabled={actionLoading === user.id}
                                                                onClick={() => handleApproveSeller(user.id)}
                                                            >
                                                                <ShieldCheck className="h-3 w-3 mr-1" />
                                                                {actionLoading === user.id ? 'Approving...' : user.seller_status === 'approved' ? 'Generate Credentials' : 'Approve Seller'}
                                                            </Button>
                                                        )}
                                                        {user.user_type === 'seller' && user.seller_status === 'approved' && sellerHasCredentials(user) && (
                                                            <Button variant="outline" size="sm" className="h-7 text-xs text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => handleVerify(user.id, false)}>
                                                                <XCircle className="h-3 w-3 mr-1" /> Unverify
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={7} className="px-6 py-10 text-center text-slate-500">No users match your search.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {!isLoading && pagination.pages > 1 && (
                        <div className="flex justify-center gap-2">
                            <Button variant="outline" disabled={pagination.page === 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>
                                Previous
                            </Button>
                            <span className="flex items-center px-4 text-sm text-slate-600">Page {pagination.page} of {pagination.pages}</span>
                            <Button variant="outline" disabled={pagination.page === pagination.pages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>
                                Next
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
