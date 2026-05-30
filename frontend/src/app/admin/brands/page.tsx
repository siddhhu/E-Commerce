'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminBrandsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function AdminBrandsPage() {
    const { toast } = useToast();
    const [brands, setBrands] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Dialog state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState<any | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        logo_url: '',
    });

    useEffect(() => {
        fetchBrands();
    }, []);

    const fetchBrands = async () => {
        try {
            setIsLoading(true);
            const data = await adminBrandsApi.list();
            setBrands(data);
        } catch (error) {
            console.error('Failed to fetch brands', error);
            toast({ title: 'Error', description: 'Failed to load brands', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenDialog = (brand?: any) => {
        if (brand) {
            setEditingBrand(brand);
            setFormData({
                name: brand.name,
                slug: brand.slug,
                logo_url: brand.logo_url || '',
            });
        } else {
            setEditingBrand(null);
            setFormData({ name: '', slug: '', logo_url: '' });
        }
        setIsDialogOpen(true);
    };

    const generateSlug = (name: string) => {
        return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        if (!editingBrand) {
            setFormData({ ...formData, name, slug: generateSlug(name) });
        } else {
            setFormData({ ...formData, name });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingBrand) {
                await adminBrandsApi.update(editingBrand.id, formData);
                toast({ title: 'Success', description: 'Brand updated successfully' });
            } else {
                await adminBrandsApi.create(formData);
                toast({ title: 'Success', description: 'Brand created successfully' });
            }
            setIsDialogOpen(false);
            fetchBrands();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to save brand', variant: 'destructive' });
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this brand?')) {
            try {
                await adminBrandsApi.delete(id);
                toast({ title: 'Success', description: 'Brand deleted successfully' });
                fetchBrands();
            } catch (error: any) {
                toast({ title: 'Error', description: 'Cannot delete brand. It may be linked to products.', variant: 'destructive' });
            }
        }
    };

    const filteredBrands = brands.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Brands</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage product brands and logos</p>
                </div>
                <Button onClick={() => handleOpenDialog()} className="bg-primary text-white">
                    <Plus className="mr-2 h-4 w-4" /> Add Brand
                </Button>
            </div>

            <div className="flex items-center gap-2 max-w-sm">
                <Search className="h-4 w-4 text-slate-500" />
                <Input 
                    placeholder="Search brands..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1"
                />
            </div>

            <Card>
                <CardContent className="p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                            <tr>
                                <th className="px-6 py-4">Logo</th>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Slug</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="h-24 text-center">Loading...</td>
                                </tr>
                            ) : filteredBrands.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="h-24 text-center text-slate-500">No brands found.</td>
                                </tr>
                            ) : (
                                filteredBrands.map((brand) => (
                                    <tr key={brand.id} className="bg-white border-b hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            {brand.logo_url ? (
                                                <div className="h-10 w-20 relative bg-slate-50 rounded border border-slate-100 flex items-center justify-center p-1">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={brand.logo_url} alt={brand.name} className="max-h-full max-w-full object-contain mix-blend-multiply" />
                                                </div>
                                            ) : (
                                                <div className="h-10 w-20 bg-slate-100 rounded flex items-center justify-center text-slate-400">
                                                    <ImageIcon className="h-5 w-5" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900">{brand.name}</td>
                                        <td className="px-6 py-4 text-slate-500">{brand.slug}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => handleOpenDialog(brand)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(brand.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {isDialogOpen && (
                <Card className="border-primary/20 bg-primary/5 mb-6">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg">{editingBrand ? 'Edit Brand' : 'New Brand'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Brand Name</Label>
                                    <Input id="name" required value={formData.name} onChange={handleNameChange} placeholder="e.g. L'Oreal" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="slug">Slug (URL)</Label>
                                    <Input id="slug" required value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder="e.g. loreal" />
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label htmlFor="logo">Logo URL</Label>
                                    <Input id="logo" value={formData.logo_url} onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })} placeholder="https://example.com/logo.png" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button type="submit">Save Brand</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
