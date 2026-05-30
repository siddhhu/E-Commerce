'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { adminApi, adminBrandsApi, CategoryRead } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, ChevronDown } from 'lucide-react';
import Link from 'next/link';

export default function AdminAddProductPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AdminAddProductPageContent />
        </Suspense>
    );
}

function AdminAddProductPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const duplicateId = searchParams.get('duplicate');
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([]);
    const [categories, setCategories] = useState<CategoryRead[]>([]);
    const [brands, setBrands] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [cats, brnds, prods] = await Promise.all([
                    adminApi.listCategories(),
                    adminBrandsApi.list(),
                    adminApi.listProducts({ page_size: 100 })
                ]);
                setCategories(cats);
                setBrands(brnds);
                setProducts(prods.items);
            } catch (err) {
                console.error("Failed to load data:", err);
            }
        };
        fetchData();
    }, []);
    
    // Using a simple state object for the form
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        mrp: '',
        selling_price: '',
        stock_quantity: '',
        short_description: '',
        description: '',
        image_url: '',
        category_id: '',
        category_ids: [] as string[],
        brand_id: '',
        gst_percentage: '18',
        parent_id: '',
        color_hex: '#000000',
        color_name: '',
        size: '',
        is_active: true,
        is_featured: false
    });
    const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

    useEffect(() => {
        if (duplicateId) {
            const fetchDuplicate = async () => {
                try {
                    const product = await adminApi.getProduct(duplicateId);
                    setFormData({
                        name: product.name ? `${product.name} (Copy)` : '',
                        sku: '', // Force user to enter a new SKU
                        mrp: product.mrp?.toString() || '',
                        selling_price: product.selling_price?.toString() || '',
                        stock_quantity: product.stock_quantity?.toString() || '',
                        short_description: product.short_description || '',
                        description: product.description || '',
                        image_url: product.image_url || '',
                        category_id: product.category_id || '',
                        category_ids: (product as any).category_ids || [],
                        brand_id: product.brand_id || '',
                        gst_percentage: product.gst_percentage?.toString() || '18',
                        parent_id: product.parent_id || '',
                        color_hex: (product.attributes?.color_hex as string) || (product.attributes?.color as string) || '#000000',
                        color_name: (product.attributes?.color_name as string) || '',
                        size: (product.attributes?.size as string) || '',
                        is_active: product.is_active,
                        is_featured: product.is_featured || false
                    });
                } catch (err) {
                    console.error("Failed to fetch duplicate product:", err);
                    toast({
                        title: "Failed to duplicate",
                        description: "Could not load the product data to duplicate.",
                        variant: "destructive"
                    });
                }
            };
            fetchDuplicate();
        }
    }, [duplicateId, toast]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Validation
        const mrp = parseFloat(formData.mrp);
        const sellingPrice = parseFloat(formData.selling_price);
        const stock = parseInt(formData.stock_quantity, 10);

        if (isNaN(mrp) || mrp <= 0) {
            toast({ title: "Invalid MRP", description: "MRP must be a positive number", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        if (isNaN(sellingPrice) || sellingPrice <= 0) {
            toast({ title: "Invalid Selling Price", description: "Selling price must be a positive number", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        if (sellingPrice > mrp) {
            toast({ title: "Pricing Error", description: "Selling price cannot be greater than MRP", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        try {
            const created = await adminApi.createProduct({
                name: formData.name,
                sku: formData.sku,
                mrp: mrp,
                selling_price: sellingPrice,
                stock_quantity: isNaN(stock) ? 0 : stock,
                gst_percentage: Number(formData.gst_percentage),
                short_description: formData.short_description,
                description: formData.description,
                image_url: formData.image_url,
                category_id: formData.category_ids[0] || formData.category_id || undefined,
                category_ids: formData.category_ids,
                brand_id: formData.brand_id || undefined,
                parent_id: formData.parent_id || undefined,
                attributes: {
                    color_hex: formData.color_hex !== '#000000' ? formData.color_hex : undefined,
                    color_name: formData.color_name || undefined,
                    size: formData.size || undefined,
                },
                is_active: formData.is_active,
                is_featured: formData.is_featured,
                slug: formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || `product-${Date.now()}`
            });

            if (selectedImageFiles.length > 0) {
                await Promise.all(selectedImageFiles.map(async (file, index) => {
                    await adminApi.uploadProductImage(created.id, file, index === 0);
                }));
            }

            toast({ title: "Product created successfully!" });
            router.push('/admin/products');
            
        } catch (error: any) {
             toast({
                title: "Error creating product",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Link href="/admin/products">
                    <Button variant="outline" size="sm" className="gap-2">
                        <ArrowLeft className="h-4 w-4" /> Back to Products
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        {duplicateId ? "Duplicate Product" : "Add New Product"}
                    </h1>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid gap-6 md:grid-cols-3">
                    <div className="md:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Basic Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Product Name *</Label>
                                    <Input 
                                        id="name" name="name" required
                                        value={formData.name} onChange={handleChange} 
                                        placeholder="E.g., Matte Liquid Lipstick"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="short_description">Short Description</Label>
                                    <Textarea 
                                        id="short_description" name="short_description" 
                                        value={formData.short_description} onChange={handleChange} 
                                        placeholder="A brief summary for product cards..."
                                        className="h-20"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Full Description</Label>
                                    <Textarea 
                                        id="description" name="description" 
                                        value={formData.description} onChange={handleChange} 
                                        placeholder="Detailed HTML or text description..."
                                        className="h-32"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Categories</Label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                                            className="flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                        >
                                            <span className={formData.category_ids.length === 0 ? 'text-muted-foreground' : 'text-foreground'}>
                                                {formData.category_ids.length === 0
                                                    ? 'Select categories'
                                                    : `${formData.category_ids.length} selected`}
                                            </span>
                                            <ChevronDown className={`h-4 w-4 transition-transform ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {categoryDropdownOpen && (
                                            <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg max-h-60 overflow-y-auto">
                                                {categories.map(cat => (
                                                    <label
                                                        key={cat.id}
                                                        className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.category_ids.includes(cat.id)}
                                                            onChange={(e) => {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    category_ids: e.target.checked
                                                                        ? [...prev.category_ids, cat.id]
                                                                        : prev.category_ids.filter(id => id !== cat.id)
                                                                }));
                                                            }}
                                                            className="h-4 w-4 rounded border-slate-300 text-[#d81b60] focus:ring-[#d81b60]"
                                                        />
                                                        {cat.name}
                                                    </label>
                                                ))}
                                                {categories.length === 0 && (
                                                    <div className="px-3 py-2 text-sm text-muted-foreground italic">No categories available</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {/* Selected pills */}
                                    {formData.category_ids.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {formData.category_ids.map(catId => {
                                                const cat = categories.find(c => c.id === catId);
                                                return cat ? (
                                                    <span key={catId} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                                                        {cat.name}
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({ ...prev, category_ids: prev.category_ids.filter(id => id !== catId) }))}
                                                            className="hover:text-pink-950"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                ) : null;
                                            })}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="brand_id">Brand</Label>
                                    <select
                                        id="brand_id"
                                        name="brand_id"
                                        value={formData.brand_id}
                                        onChange={handleChange}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <option value="">No Brand</option>
                                        {brands.map(brand => (
                                            <option key={brand.id} value={brand.id}>
                                                {brand.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Variant Options */}
                                <div className="space-y-4 border-t pt-4 mt-4">
                                    <h3 className="text-sm font-semibold">Variant Settings (Optional)</h3>
                                    <div className="space-y-2">
                                        <Label htmlFor="parent_id">Is this a variant of another product?</Label>
                                        <select
                                            id="parent_id"
                                            name="parent_id"
                                            value={formData.parent_id}
                                            onChange={handleChange}
                                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <option value="">No, this is a standalone product</option>
                                            {products.filter(p => !p.parent_id).map(prod => (
                                                <option key={prod.id} value={prod.id}>{prod.name} ({prod.sku})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="color_name">Shade Name</Label>
                                            <Input 
                                                id="color_name" name="color_name" 
                                                value={formData.color_name} onChange={handleChange} 
                                                placeholder="e.g., Ruby Red"
                                            />
                                        </div>
                                        <div className="space-y-2 flex flex-col">
                                            <Label htmlFor="color_hex">Shade Color</Label>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="color" id="color_hex" name="color_hex" 
                                                    value={formData.color_hex} onChange={handleChange} 
                                                    className="w-10 h-10 p-1 rounded border cursor-pointer"
                                                />
                                                <span className="text-sm text-muted-foreground uppercase">{formData.color_hex}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="size">Size / Weight</Label>
                                            <Input 
                                                id="size" name="size" 
                                                value={formData.size} onChange={handleChange} 
                                                placeholder="e.g., 50g, 100ml, XL"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        
                         <Card>
                            <CardHeader>
                                <CardTitle>Pricing & Inventory</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="mrp">Maximum Retail Price (MRP) *</Label>
                                        <Input 
                                            id="mrp" name="mrp" type="number" step="0.01" required
                                            value={formData.mrp} onChange={handleChange} 
                                            placeholder="₹ 0.00"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="selling_price">Selling Price *</Label>
                                        <Input 
                                            id="selling_price" name="selling_price" type="number" step="0.01" required
                                            value={formData.selling_price} onChange={handleChange} 
                                            className="border-primary/50 focus-visible:ring-primary/50"
                                            placeholder="₹ 0.00"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="sku">SKU (Stock Keeping Unit) *</Label>
                                        <Input 
                                            id="sku" name="sku" required
                                            value={formData.sku} onChange={handleChange} 
                                            placeholder="E.g., LIP-MAT-001"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="stock_quantity">Initial Stock Quantity *</Label>
                                        <Input 
                                            id="stock_quantity" name="stock_quantity" type="number" required
                                            value={formData.stock_quantity} onChange={handleChange} 
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="gst_percentage">GST Percentage *</Label>
                                        <select
                                            id="gst_percentage"
                                            name="gst_percentage"
                                            value={formData.gst_percentage}
                                            onChange={handleChange}
                                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            required
                                        >
                                            <option value="0">0% (NIL)</option>
                                            <option value="2">2%</option>
                                            <option value="5">5%</option>
                                            <option value="12">12%</option>
                                            <option value="18">18%</option>
                                            <option value="28">28%</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t flex items-center space-x-2">
                                    <input 
                                        type="checkbox" 
                                        id="is_featured" 
                                        name="is_featured" 
                                        checked={formData.is_featured} 
                                        onChange={handleChange} 
                                        className="h-4 w-4 rounded border-slate-300 text-[#d81b60] focus:ring-[#d81b60]"
                                    />
                                    <Label htmlFor="is_featured" className="text-sm font-medium leading-none cursor-pointer">
                                        Feature this product
                                    </Label>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Publishing</CardTitle>
                                <CardDescription>Control when this product is visible.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center space-x-2">
                                    <input 
                                        type="checkbox" 
                                        id="is_active" 
                                        name="is_active"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData(p => ({ ...p, is_active: e.target.checked }))}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <Label htmlFor="is_active" className="cursor-pointer">Active in Store</Label>
                                </div>
                                <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                                    {isLoading ? "Saving..." : <><Save className="h-4 w-4"/> Save Product</>}
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Product Image</CardTitle>
                                <CardDescription>Add a primary image URL.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="image_url">Image URL</Label>
                                    <Input 
                                        id="image_url" name="image_url"
                                        value={formData.image_url} onChange={handleChange} 
                                        placeholder="https://example.com/image.jpg"
                                    />
                                    <div className="pt-2">
                                        <Label>Or upload from device (JPG/PNG/WEBP, multiple allowed)</Label>
                                        <Input
                                            type="file"
                                            multiple
                                            accept="image/jpeg,image/png,image/webp"
                                            onChange={(e) => {
                                                if (e.target.files) {
                                                    setSelectedImageFiles(Array.from(e.target.files));
                                                }
                                            }}
                                        />
                                        {selectedImageFiles.length > 0 && (
                                            <p className="text-sm text-muted-foreground mt-2">
                                                {selectedImageFiles.length} file(s) selected
                                            </p>
                                        )}
                                    </div>
                                    {formData.image_url && (
                                        <div className="mt-2 relative aspect-square rounded-md overflow-hidden bg-slate-100 border">
                                            <img 
                                                src={formData.image_url} 
                                                alt="Preview" 
                                                className="object-contain w-full h-full"
                                                onError={(e) => (e.currentTarget.src = 'https://placehold.co/400?text=Invalid+URL')}
                                            />
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </div>
    );
}
