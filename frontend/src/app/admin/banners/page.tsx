'use client';

import { useEffect, useState } from 'react';
import { adminApi, Banner } from '@/lib/api';
import {
    Plus, Trash2, Edit2, CheckCircle, XCircle,
    Image as ImageIcon, MoreVertical, ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '../../../components/ui/badge';
import Image from 'next/image';

export default function AdminBannersPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        image_url: '',
        link_url: '',
        sort_order: 0,
        is_active: true
    });

    useEffect(() => {
        fetchBanners();
    }, []);

    const fetchBanners = async () => {
        setIsLoading(true);
        try {
            const data = await adminApi.listBanners();
            setBanners(data.items);
        } catch (err: any) {
            setError(err.message || "Failed to load banners");
        } finally {
            setIsLoading(false);
        }
    };

    const handleBannerImageUpload = async (file: File) => {
        setIsUploadingImage(true);
        try {
            const res = await adminApi.uploadBannerImage(file);
            setFormData((prev) => ({ ...prev, image_url: res.image_url }));
        } catch (err: any) {
            alert(err.message || 'Failed to upload banner image');
        } finally {
            setIsUploadingImage(false);
        }
    };

    const handleOpenModal = (banner: Banner | null = null) => {
        if (banner) {
            setEditingBanner(banner);
            setFormData({
                title: banner.title,
                image_url: banner.image_url,
                link_url: banner.link_url || '',
                sort_order: banner.sort_order,
                is_active: banner.is_active
            });
        } else {
            setEditingBanner(null);
            setFormData({
                title: '',
                image_url: '',
                link_url: '',
                sort_order: banners.length,
                is_active: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (editingBanner) {
                await adminApi.updateBanner(editingBanner.id, formData);
            } else {
                await adminApi.createBanner(formData);
            }
            setIsModalOpen(false);
            fetchBanners();
        } catch (err: any) {
            alert(err.message || "Failed to save banner");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this banner?')) return;

        try {
            await adminApi.deleteBanner(id);
            fetchBanners();
        } catch (err: any) {
            alert(err.message || "Failed to delete banner");
        }
    };

    const toggleStatus = async (banner: Banner) => {
        try {
            await adminApi.updateBanner(banner.id, { is_active: !banner.is_active });
            fetchBanners();
        } catch (err: any) {
            alert(err.message || "Failed to update status");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Banners</h1>
                    <p className="text-slate-500 mt-2">Manage homepage offer banners.</p>
                </div>
                <Button onClick={() => handleOpenModal()}>
                    <Plus className="mr-2 h-4 w-4" /> Add Banner
                </Button>
            </div>

            {error && (
                <div className="rounded-md bg-red-50 p-4 mb-6">
                    <div className="text-sm text-red-700">{error}</div>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                    [1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full" />)
                ) : banners.length > 0 ? (
                    banners.map((banner) => (
                        <Card key={banner.id} className="overflow-hidden group ring-primary">
                            <div className="relative h-40 bg-slate-100">
                                {banner.image_url ? (
                                    <img
                                        src={banner.image_url}
                                        alt={banner.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <ImageIcon className="h-10 w-10 text-slate-300" />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 flex gap-1">
                                    <Badge className={banner.is_active ? "bg-green-500" : "bg-slate-500"}>
                                        {banner.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                            </div>
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg truncate w-4/5">{banner.title}</h3>
                                    <div className="text-xs text-slate-400">Order: {banner.sort_order}</div>
                                </div>
                                <p className="text-sm text-slate-500 mb-4 truncate italic">
                                    {banner.link_url || 'No link'}
                                </p>
                                <div className="flex justify-between gap-2 mt-4 pt-4 border-t">
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => toggleStatus(banner)}>
                                            {banner.is_active ? <XCircle className="h-4 w-4 text-amber-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                                            <span className="ml-1 sr-only">{banner.is_active ? 'Deactivate' : 'Activate'}</span>
                                        </Button>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => handleOpenModal(banner)}>
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(banner.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center border-2 border-dashed rounded-lg bg-slate-50">
                        <ImageIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-900">No banners found</h3>
                        <p className="text-slate-500 mb-6">Start by adding your first promotional banner.</p>
                        <Button onClick={() => handleOpenModal()}>
                            Add First Banner
                        </Button>
                    </div>
                )}
            </div>

            {/* Banner Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
                            <h2 className="text-xl font-bold">{editingBanner ? 'Edit Banner' : 'Add New Banner'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary/50 outline-none"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Summer Offer 50% Off"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label>
                                <input
                                    type="url"
                                    required
                                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary/50 outline-none font-mono text-xs"
                                    value={formData.image_url}
                                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                    placeholder="https://example.com/banner.jpg"
                                />
                                <div className="mt-2">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">
                                        Or upload image (JPG/PNG/WEBP, max 10MB)
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        disabled={isUploadingImage}
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) handleBannerImageUpload(f);
                                        }}
                                    />
                                    {isUploadingImage && (
                                        <div className="text-xs text-slate-500 mt-1">Uploading...</div>
                                    )}
                                </div>
                                {formData.image_url && (
                                    <div className="mt-2 h-20 w-full relative border rounded overflow-hidden">
                                        <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Link URL (Optional)</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary/50 outline-none font-mono text-xs"
                                    value={formData.link_url}
                                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                                    placeholder="/products/new-arrivals"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Sort Order</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary/50 outline-none"
                                        value={formData.sort_order}
                                        onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className="flex items-center gap-2 mt-6">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded"
                                    />
                                    <label htmlFor="is_active" className="text-sm font-medium text-slate-700">Active</label>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="flex-1" disabled={isSaving}>
                                    {isSaving ? 'Saving...' : editingBanner ? 'Update Banner' : 'Create Banner'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
