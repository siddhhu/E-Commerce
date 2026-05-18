'use client';

import { useEffect, useState } from 'react';
import { adminApi, CategoryRead } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Edit, Plus, Trash2, X } from 'lucide-react';

export default function AdminCategoriesPage() {
    const [categories, setCategories] = useState<CategoryRead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        slug: '',
        description: '',
        is_active: true
    });

    const { toast } = useToast();

    const fetchCategories = async () => {
        setIsLoading(true);
        try {
            const data = await adminApi.listCategories();
            setCategories(data);
        } catch (error: any) {
            toast({
                title: "Error fetching categories",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleOpenForm = (category?: CategoryRead) => {
        if (category) {
            setFormData({
                id: category.id,
                name: category.name,
                slug: category.slug,
                description: category.description || '',
                is_active: category.is_active
            });
        } else {
            setFormData({
                id: '',
                name: '',
                slug: '',
                description: '',
                is_active: true
            });
        }
        setIsFormOpen(true);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        // Auto-generate slug if empty
        const slugToSave = formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        try {
            if (formData.id) {
                await adminApi.updateCategory(formData.id, {
                    name: formData.name,
                    slug: slugToSave,
                    description: formData.description,
                    is_active: formData.is_active
                });
                toast({ title: "Category updated successfully" });
            } else {
                await adminApi.createCategory({
                    name: formData.name,
                    slug: slugToSave,
                    description: formData.description,
                    is_active: formData.is_active
                });
                toast({ title: "Category created successfully" });
            }
            setIsFormOpen(false);
            fetchCategories();
        } catch (error: any) {
            toast({
                title: "Error saving category",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this category? Products in this category will lose their association.')) return;
        
        try {
            await adminApi.deleteCategory(id);
            toast({ title: "Category deleted" });
            fetchCategories();
        } catch (error: any) {
            toast({
                title: "Error deleting category",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Categories</h1>
                    <p className="text-slate-500 mt-2">Manage product categories</p>
                </div>
                <Button onClick={() => handleOpenForm()} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Category
                </Button>
            </div>

            {isFormOpen && (
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg">{formData.id ? 'Edit Category' : 'New Category'}</CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setIsFormOpen(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name *</Label>
                                    <Input 
                                        id="name" name="name" required
                                        value={formData.name} onChange={handleChange} 
                                        placeholder="e.g. Electronics"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="slug">Slug (optional)</Label>
                                    <Input 
                                        id="slug" name="slug" 
                                        value={formData.slug} onChange={handleChange} 
                                        placeholder="e.g. electronics"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 pt-2">
                                <input 
                                    type="checkbox" id="is_active" name="is_active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData(p => ({ ...p, is_active: e.target.checked }))}
                                    className="h-4 w-4 rounded border-gray-300 text-primary"
                                />
                                <Label htmlFor="is_active">Active</Label>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving ? 'Saving...' : 'Save Category'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-8 text-center text-slate-500">Loading categories...</div>
                    ) : categories.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No categories found. Click Add Category to create one.</div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                                <tr>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Slug</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map((cat) => (
                                    <tr key={cat.id} className="bg-white border-b hover:bg-slate-50">
                                        <td className="px-6 py-4 font-medium text-slate-900">{cat.name}</td>
                                        <td className="px-6 py-4 text-slate-500">{cat.slug}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                cat.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {cat.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <Button variant="ghost" size="sm" onClick={() => handleOpenForm(cat)} className="h-8 w-8 p-0">
                                                <Edit className="h-4 w-4 text-slate-500" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(cat.id)} className="h-8 w-8 p-0 hover:text-red-600">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
