'use client';

import { useEffect, useState } from 'react';
import { adminApi, User } from '@/lib/api';
import { 
    Search, ShieldCheck, XCircle, Building2, FileText, Mail, Phone, Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
    const [selected, setSelected] = useState<User | null>(null);

    useEffect(() => { fetchUsers(); }, [pagination.page, typeFilter]);

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

    const handleVerify = async (userId: string, isVerified: boolean) => {
        try {
            const updated = await adminApi.verifyUser(userId, isVerified);
            setUsers(users.map(u => u.id === userId ? updated : u));
            if (selected?.id === userId) setSelected(updated);
        } catch (err: any) {
            alert(err.message || 'Failed to update verification status');
        }
    };

    const filtered = users.filter(u => {
        const matchSearch = u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
            (u.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
            (u.phone?.includes(searchTerm) ?? false);
        const matchType = typeFilter === '' || u.user_type === typeFilter;
        return matchSearch && matchType;
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">User Management</h1>
                <p className="text-slate-500 mt-1">View registrations, account details and manage verification.</p>
            </div>

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
                                <Badge variant={selected.user_type === 'B2B' ? 'secondary' : 'outline'} className="mt-0.5">
                                    {selected.user_type}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Role</p>
                                <p className="font-medium mt-0.5 capitalize">{selected.role?.replace('_', ' ')}</p>
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
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Account Status</p>
                                <Badge variant={selected.is_active ? 'success' : 'destructive'} className="mt-0.5">
                                    {selected.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Verification</p>
                                <Badge variant={selected.is_verified ? 'success' : 'warning'} className="mt-0.5">
                                    {selected.is_verified ? 'Verified' : 'Pending'}
                                </Badge>
                            </div>
                        </div>
                        {selected.user_type === 'B2B' && (
                            <div className="mt-4 pt-4 border-t flex gap-3">
                                {!selected.is_verified ? (
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleVerify(selected.id, true)}>
                                        <ShieldCheck className="h-4 w-4 mr-1" /> Approve Account
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
                            <option value="B2B">Wholesale Only</option>
                            <option value="B2C">B2C Only</option>
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
                                                {user.user_type === 'B2B' ? (
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
                                                <Badge variant={user.user_type === 'B2B' ? 'secondary' : 'outline'} className="text-[10px]">
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
                                                    {user.user_type === 'B2B' && (
                                                        <Badge variant={user.is_verified ? 'success' : 'warning'} className="text-[9px] w-fit">
                                                            {user.is_verified ? 'VERIFIED' : 'PENDING'}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                                {user.user_type === 'B2B' && !user.is_verified && (
                                                    <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7 text-xs" onClick={() => handleVerify(user.id, true)}>
                                                        <ShieldCheck className="h-3 w-3 mr-1" /> Approve
                                                    </Button>
                                                )}
                                                {user.user_type === 'B2B' && user.is_verified && (
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
        </div>
    );
}
