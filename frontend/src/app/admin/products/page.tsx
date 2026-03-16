'use client';

import { useEffect, useState } from 'react';
import { adminApi, ProductSummary, PaginatedProducts } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Upload, Edit, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import { BulkUploadModal } from '@/components/admin/BulkUploadModal';

export default function AdminProductsPage() {
    const [productsData, setProductsData] = useState<PaginatedProducts | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({ page: 1, page_size: 10, search: '' });
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const { toast } = useToast();

    const fetchProducts = async () => {
        setIsLoading(true);
        try {
            const data = await adminApi.listProducts(filters);
            setProductsData(data);
        } catch (error: any) {
             toast({
                title: "Error fetching products",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => fetchProducts(), 300); // debounce
        return () => clearTimeout(timeoutId);
    }, [filters.page, filters.search]);

    const getImageUrl = (url?: string) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';
        return `${baseUrl}${url}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Products</h1>
                    <p className="text-slate-500 mt-2">Manage your catalog, pricing, and inventory.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2 bg-white" onClick={() => setIsUploadModalOpen(true)}>
                        <Upload className="h-4 w-4" /> Bulk Upload
                    </Button>
                    <Link href="/admin/products/new">
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" /> Add Product
                        </Button>
                    </Link>
                </div>
            </div>

            <Card>
                <CardHeader className="border-b bg-slate-50/50">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Search by name or SKU..."
                            className="pl-9 bg-white"
                            value={filters.search}
                            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-8 text-center text-slate-500">Loading products...</div>
                    ) : !productsData?.items?.length ? (
                        <div className="p-8 text-center text-slate-500">No products found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                                    <tr>
                                        <th className="px-6 py-4">Product</th>
                                        <th className="px-6 py-4">SKU</th>
                                        <th className="px-6 py-4">Price</th>
                                        <th className="px-6 py-4">Inventory</th>
                                        <th className="px-6 py-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {productsData.items.map((product) => (
                                        <tr key={product.id} className="bg-white border-b hover:bg-slate-50">
                                            <td className="px-6 py-4 flex items-center gap-4">
                                                <div className="h-12 w-12 flex-shrink-0 bg-slate-100 rounded-md overflow-hidden relative border flex items-center justify-center">
                                                    {product.primary_image ? (
                                                        <Image 
                                                            src={getImageUrl(product.primary_image) || ''} 
                                                            alt={product.name}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <ImageIcon className="h-5 w-5 text-slate-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">{product.name}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">{product.short_description}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                                                {product.sku}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900">{formatCurrency(product.selling_price)}</div>
                                                {product.mrp > product.selling_price && (
                                                    <div className="text-xs text-slate-500 line-through">{formatCurrency(product.mrp)}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                    product.stock_quantity > 20 ? 'bg-green-100 text-green-800' :
                                                    product.stock_quantity > 0 ? 'bg-amber-100 text-amber-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                    {product.stock_quantity} in stock
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Link href={`/admin/products/${product.id}/edit`}>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <Edit className="h-4 w-4 text-slate-500" />
                                                    </Button>
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
                
                {/* Pagination */}
                {productsData && productsData.total > productsData.page_size && (
                    <div className="flex items-center justify-between px-6 py-4 border-t">
                         <div className="text-sm text-slate-500">
                            Showing <span className="font-medium">{((filters.page - 1) * filters.page_size) + 1}</span> to <span className="font-medium">{Math.min(filters.page * filters.page_size, productsData.total)}</span> of <span className="font-medium">{productsData.total}</span> products
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                                disabled={filters.page === 1}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                                disabled={filters.page * filters.page_size >= productsData.total}
                            >
                                Next <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            <BulkUploadModal 
                isOpen={isUploadModalOpen} 
                onClose={() => setIsUploadModalOpen(false)} 
                onSuccess={() => {
                    setIsUploadModalOpen(false);
                    fetchProducts();
                }}
            />
        </div>
    );
}
