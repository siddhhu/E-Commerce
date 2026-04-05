'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminApi, PromoCode } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function AdminPromoCodesPage() {
    const { toast } = useToast();
    const [data, setData] = useState<{ items: PromoCode[]; total: number; page: number; page_size: number } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [form, setForm] = useState({
        code: '',
        discount_type: 'flat' as 'flat' | 'percent',
        discount_value: '',
        max_discount_amount: '1000',
        max_uses: '',
        expires_at: '',
        is_active: true,
    });

    const fetchPromoCodes = async () => {
        setIsLoading(true);
        try {
            const res = await adminApi.listPromoCodes({ page: 1, page_size: 200 });
            setData(res);
        } catch (e: any) {
            toast({ title: 'Failed to load promo codes', description: e.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPromoCodes();
    }, []);

    const canSubmit = useMemo(() => {
        if (!form.code.trim()) return false;
        const dv = Number(form.discount_value);
        if (!dv || dv <= 0) return false;
        if (form.discount_type === 'percent' && dv > 100) return false;
        const cap = Number(form.max_discount_amount);
        if (form.discount_type === 'percent' && (!cap || cap <= 0)) return false;
        return true;
    }, [form]);

    const handleCreate = async () => {
        if (!canSubmit) return;
        setIsSaving(true);
        try {
            await adminApi.createPromoCode({
                code: form.code.trim(),
                discount_type: form.discount_type,
                discount_value: Number(form.discount_value),
                max_discount_amount: Number(form.max_discount_amount || 1000),
                is_active: form.is_active,
                max_uses: form.max_uses ? Number(form.max_uses) : null,
                expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
            });
            toast({ title: 'Promo code created' });
            setForm((f) => ({ ...f, code: '', discount_value: '' }));
            await fetchPromoCodes();
        } catch (e: any) {
            toast({ title: 'Failed to create promo code', description: e.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleActive = async (p: PromoCode) => {
        try {
            await adminApi.updatePromoCode(p.id, { is_active: !p.is_active });
            await fetchPromoCodes();
        } catch (e: any) {
            toast({ title: 'Failed to update promo code', description: e.message, variant: 'destructive' });
        }
    };

    const handleDelete = async (p: PromoCode) => {
        if (!confirm(`Delete promo code ${p.code}?`)) return;
        try {
            await adminApi.deletePromoCode(p.id);
            toast({ title: 'Promo code deleted' });
            await fetchPromoCodes();
        } catch (e: any) {
            toast({ title: 'Failed to delete promo code', description: e.message, variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Promo Codes</h1>
                <p className="text-slate-500 mt-2">Create and manage discount codes (flat or percent with ₹1000 cap).</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Create Promo Code</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div>
                            <div className="text-sm font-medium mb-1">Code</div>
                            <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="WELCOME200" />
                        </div>
                        <div>
                            <div className="text-sm font-medium mb-1">Type</div>
                            <select
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                value={form.discount_type}
                                onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value as any }))}
                            >
                                <option value="flat">Flat (₹)</option>
                                <option value="percent">Percent (%)</option>
                            </select>
                        </div>
                        <div>
                            <div className="text-sm font-medium mb-1">Value</div>
                            <Input value={form.discount_value} onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))} placeholder={form.discount_type === 'flat' ? '200' : '10'} />
                        </div>
                    </div>

                    {form.discount_type === 'percent' && (
                        <div className="grid gap-4 md:grid-cols-3">
                            <div>
                                <div className="text-sm font-medium mb-1">Max Discount (₹)</div>
                                <Input value={form.max_discount_amount} onChange={(e) => setForm((f) => ({ ...f, max_discount_amount: e.target.value }))} placeholder="1000" />
                            </div>
                            <div>
                                <div className="text-sm font-medium mb-1">Max Uses (optional)</div>
                                <Input value={form.max_uses} onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))} placeholder="100" />
                            </div>
                            <div>
                                <div className="text-sm font-medium mb-1">Expires At (optional)</div>
                                <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))} />
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
                            Active
                        </label>
                        <Button disabled={!canSubmit || isSaving} onClick={handleCreate}>
                            {isSaving ? 'Saving...' : 'Create'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Existing Promo Codes</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="p-6 text-slate-500">Loading...</div>
                    ) : !data?.items?.length ? (
                        <div className="p-6 text-slate-500">No promo codes found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3">Code</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3">Value</th>
                                        <th className="px-4 py-3">Cap</th>
                                        <th className="px-4 py-3">Uses</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map((p) => (
                                        <tr key={p.id} className="border-b bg-white">
                                            <td className="px-4 py-3 font-mono font-semibold">{p.code}</td>
                                            <td className="px-4 py-3">{p.discount_type}</td>
                                            <td className="px-4 py-3">{p.discount_value}</td>
                                            <td className="px-4 py-3">{p.discount_type === 'percent' ? p.max_discount_amount : '-'}</td>
                                            <td className="px-4 py-3">{p.used_count}{p.max_uses ? ` / ${p.max_uses}` : ''}</td>
                                            <td className="px-4 py-3">{p.is_active ? 'Active' : 'Inactive'}</td>
                                            <td className="px-4 py-3 text-right space-x-2">
                                                <Button variant="outline" size="sm" onClick={() => handleToggleActive(p)}>
                                                    {p.is_active ? 'Deactivate' : 'Activate'}
                                                </Button>
                                                <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDelete(p)}>
                                                    Delete
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
