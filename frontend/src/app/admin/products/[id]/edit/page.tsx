'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { adminApi, Product } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function AdminEditProductPage() {
    const router = useRouter();
    const params = useParams();
    const productId = params.id as string;
    const { toast } = useToast();
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        mrp: '',
        selling_price: '',
        stock_quantity: '',
        short_description: '',
        description: '',
        is_active: true
    });

    useEffect(() => {
        const fetchProduct = async () => {
            if (!productId) return;
            try {
                const product = await adminApi.getProduct(productId);
                setFormData({
                    name: product.name || '',
                    sku: product.sku || '',
                    mrp: product.mrp?.toString() || '',
                    selling_price: product.selling_price?.toString() || '',
                    stock_quantity: product.stock_quantity?.toString() || '',
                    short_description: product.short_description || '',
                    description: product.description || '',
                    is_active: product.is_active
                });
            } catch (error: any) {
                toast({
                    title: "Failed to load product",
                    description: error.message,
                    variant: "destructive"
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchProduct();
    }, [productId, toast]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            await adminApi.updateProduct(productId, {
                name: formData.name,
                sku: formData.sku,
                mrp: parseFloat(formData.mrp),
                selling_price: parseFloat(formData.selling_price),
                stock_quantity: parseInt(formData.stock_quantity, 10),
                short_description: formData.short_description,
                description: formData.description,
                is_active: formData.is_active
            });

            toast({ title: "Product updated successfully!" });
            router.push('/admin/products');
            
        } catch (error: any) {
             toast({
                title: "Error updating product",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Link href="/admin/products">
                    <Button variant="outline" size="sm" className="gap-2">
                        <ArrowLeft className="h-4 w-4" /> Back to Products
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Edit Product</h1>
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
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="short_description">Short Description</Label>
                                    <Textarea 
                                        id="short_description" name="short_description" 
                                        value={formData.short_description} onChange={handleChange} 
                                        className="h-20"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Full Description</Label>
                                    <Textarea 
                                        id="description" name="description" 
                                        value={formData.description} onChange={handleChange} 
                                        className="h-32"
                                    />
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
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="selling_price">Selling Price *</Label>
                                        <Input 
                                            id="selling_price" name="selling_price" type="number" step="0.01" required
                                            value={formData.selling_price} onChange={handleChange} 
                                            className="border-primary/50 focus-visible:ring-primary/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="sku">SKU *</Label>
                                        <Input 
                                            id="sku" name="sku" required
                                            value={formData.sku} onChange={handleChange} 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="stock_quantity">Stock Quantity *</Label>
                                        <Input 
                                            id="stock_quantity" name="stock_quantity" type="number" required
                                            value={formData.stock_quantity} onChange={handleChange} 
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Publishing</CardTitle>
                                <CardDescription>Control visibility</CardDescription>
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
                                <Button type="submit" className="w-full gap-2" disabled={isSaving}>
                                    {isSaving ? "Saving..." : <><Save className="h-4 w-4"/> Save Changes</>}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </div>
    );
}
