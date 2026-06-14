'use client';

import { useEffect, useState } from 'react';
import { adminApi, ProductSummary, PaginatedProducts } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Upload, Edit, Trash2, ChevronLeft, ChevronRight, Image as ImageIcon, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import { BulkUploadModal } from '@/components/admin/BulkUploadModal';
import { useAuthStore } from '@/store/auth-store';

export default function AdminProductsPage() {
    const [productsData, setProductsData] = useState<PaginatedProducts | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({ page: 1, page_size: 10, search: '' });
    const [isInitialized, setIsInitialized] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const { toast } = useToast();
    const { user } = useAuthStore();
    
    const role = (user?.role || '').toString().toLowerCase();
    const isAdmin = role === 'admin' || role === 'super_admin';

    const fetchProducts = async (currentFilters: typeof filters) => {
        setIsLoading(true);
        try {
            const data = await adminApi.listProducts(currentFilters);
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

    const handleDeleteProduct = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) {
            return;
        }
        try {
            await adminApi.deleteProduct(id);
            toast({
                title: "Product deleted",
                description: `"${name}" has been deleted successfully.`,
            });
            fetchProducts(filters);
        } catch (error: any) {
            toast({
                title: "Error deleting product",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    // Restore state from sessionStorage on mount
    useEffect(() => {
        const savedPage = sessionStorage.getItem('adminProductsPage');
        const savedSearch = sessionStorage.getItem('adminProductsSearch');
        if (savedPage || savedSearch) {
            setFilters({
                page: savedPage ? parseInt(savedPage, 10) : 1,
                page_size: 10,
                search: savedSearch || ''
            });
        }
        setIsInitialized(true);
    }, []);

    // Fetch products and save to sessionStorage when filters change
    useEffect(() => {
        if (!isInitialized) return;
        
        sessionStorage.setItem('adminProductsPage', filters.page.toString());
        sessionStorage.setItem('adminProductsSearch', filters.search);
        
        const timeoutId = setTimeout(() => fetchProducts(filters), 300); // debounce
        return () => clearTimeout(timeoutId);
    }, [filters.page, filters.search, isInitialized]);

    const getImageUrl = (url?: string) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';
        return `${baseUrl}${url}`;
    };

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Products</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage your catalog, pricing, and inventory.</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" className="gap-1.5 bg-white" onClick={() => setIsUploadModalOpen(true)}>
                        <Upload className="h-3.5 w-3.5" /> Bulk Upload
                    </Button>
                    <Link href="/admin/products/new">
                        <Button size="sm" className="gap-1.5">
                            <Plus className="h-3.5 w-3.5" /> Add Product
                        </Button>
                    </Link>
                </div>
            </div>

            <Card>
                <CardHeader className="border-b bg-slate-50/50">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Search by name or HSN code..."
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
                        <>
                            {/* ── Desktop Table ───────────────────────────── */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                                        <tr>
                                            <th className="px-6 py-4">Product</th>
                                            <th className="px-6 py-4">HSN Code</th>
                                            <th className="px-6 py-4">Price</th>
                                            <th className="px-6 py-4">Inventory</th>
                                            {isAdmin && <th className="px-6 py-4">Added By</th>}
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
                                                <td className="px-6 py-4 text-slate-600 font-mono text-xs">{product.sku}</td>
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
                                                {isAdmin && (
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border">
                                                            {product.seller_name || 'Pranjay'}
                                                        </span>
                                                    </td>
                                                )}
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        {isAdmin && (
                                                            <Link href={`/admin/products/new?duplicate=${product.id}`}>
                                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Duplicate Product">
                                                                    <Copy className="h-4 w-4 text-slate-500" />
                                                                </Button>
                                                            </Link>
                                                        )}
                                                        <Link href={`/admin/products/${product.id}/edit`}>
                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit Product">
                                                                <Edit className="h-4 w-4 text-slate-500" />
                                                            </Button>
                                                        </Link>
                                                        <Button
                                                            variant="ghost" size="sm" className="h-8 w-8 p-0" title="Delete Product"
                                                            onClick={() => handleDeleteProduct(product.id, product.name)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* ── Mobile Card List ────────────────────────── */}
                            <div className="md:hidden divide-y divide-slate-100">
                                {productsData.items.map((product) => (
                                    <div key={product.id} className="p-4 flex gap-3">
                                        <div className="h-16 w-16 flex-shrink-0 bg-slate-100 rounded-lg overflow-hidden relative border flex items-center justify-center">
                                            {product.primary_image ? (
                                                <Image
                                                    src={getImageUrl(product.primary_image) || ''}
                                                    alt={product.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <ImageIcon className="h-6 w-6 text-slate-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-slate-900 truncate">{product.name}</p>
                                            <p className="text-xs text-slate-500 font-mono mt-0.5">HSN: {product.sku}</p>
                                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                <span className="text-sm font-bold text-slate-900">{formatCurrency(product.selling_price)}</span>
                                                <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                                                    product.stock_quantity > 20 ? 'bg-green-100 text-green-800' :
                                                    product.stock_quantity > 0 ? 'bg-amber-100 text-amber-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                    {product.stock_quantity} in stock
                                                </span>
                                            </div>
                                            {isAdmin && product.seller_name && (
                                                <p className="text-xs text-slate-400 mt-0.5">by {product.seller_name}</p>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-1 justify-center">
                                            {isAdmin && (
                                                <Link href={`/admin/products/new?duplicate=${product.id}`}>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Duplicate Product">
                                                        <Copy className="h-4 w-4 text-slate-500" />
                                                    </Button>
                                                </Link>
                                            )}
                                            <Link href={`/admin/products/${product.id}/edit`}>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit Product">
                                                    <Edit className="h-4 w-4 text-slate-500" />
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="ghost" size="sm" className="h-8 w-8 p-0" title="Delete Product"
                                                onClick={() => handleDeleteProduct(product.id, product.name)}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </CardContent>
                
                {/* Pagination */}
                {productsData && productsData.total > productsData.page_size && (
                    <div className="flex items-center justify-between px-4 md:px-6 py-4 border-t flex-wrap gap-3">
                        <div className="text-sm text-slate-500">
                            <span className="font-medium">{((filters.page - 1) * filters.page_size) + 1}</span>
                            {' – '}
                            <span className="font-medium">{Math.min(filters.page * filters.page_size, productsData.total)}</span>
                            {' of '}
                            <span className="font-medium">{productsData.total}</span>
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
                    fetchProducts(filters);
                }}
            />
        </div>
    );
}
