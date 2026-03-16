'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

export function BulkUploadModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const { toast } = useToast();

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        try {
            // Note: This relies on the backend endpoint at /api/v1/admin/bulk-upload/products
            const response = await api.uploadFile<{
                success: boolean;
                created: number;
                updated: number;
                errors: { row: number; error: string }[];
            }>('/admin/bulk-upload/products', file);
            
            setResult(response);
            
            if (response.success || (response.created > 0 || response.updated > 0)) {
                toast({
                    title: "Upload Successful",
                    description: `Created: ${response.created}, Updated: ${response.updated}`
                });
                onSuccess(); // Refresh list
            }
        } catch (error: any) {
            toast({
                title: "Upload Failed",
                description: error.message || "Failed to process the Excel file.",
                variant: "destructive"
            });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-lg shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                    <div>
                        <CardTitle>Bulk Upload Products</CardTitle>
                        <CardDescription>Upload an Excel (.xlsx) file to add or update multiple products.</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
                </CardHeader>
                <CardContent className="pt-6">
                    {!result ? (
                        <div className="space-y-4">
                            <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center bg-slate-50 hover:bg-slate-100 transition-colors">
                                <UploadCloud className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                                <div className="space-y-2">
                                    <label htmlFor="file-upload" className="cursor-pointer">
                                        <span className="bg-primary text-white font-semibold py-2 px-4 rounded-md">
                                            Select Excel File
                                        </span>
                                        <input 
                                            id="file-upload" 
                                            name="file-upload" 
                                            type="file" 
                                            accept=".xlsx,.xls" 
                                            className="sr-only" 
                                            onChange={handleFileChange}
                                        />
                                    </label>
                                    <p className="text-sm text-slate-500 mt-2">
                                        {file ? file.name : "or drag and drop here"}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="bg-blue-50 text-blue-800 p-4 rounded-md text-sm">
                                <p className="font-semibold mb-1">Required Columns:</p>
                                <p>name, sku, mrp, selling_price, stock_quantity, category_slug, brand_slug</p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <Button variant="outline" onClick={onClose}>Cancel</Button>
                                <Button onClick={handleUpload} disabled={!file || isUploading}>
                                    {isUploading ? "Processing..." : "Upload & Process"}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 p-4 bg-green-50 text-green-800 rounded-md">
                                <CheckCircle2 className="h-6 w-6" />
                                <div>
                                    <p className="font-semibold">Processing Complete</p>
                                    <p className="text-sm">Successfully created {result.created} and updated {result.updated} products.</p>
                                </div>
                            </div>

                            {result.errors && result.errors.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-amber-600 font-semibold">
                                        <AlertTriangle className="h-5 w-5" />
                                        Found {result.errors.length} issues in the spreadsheet:
                                    </div>
                                    <div className="max-h-40 overflow-y-auto bg-amber-50 rounded-md p-3 text-sm text-amber-900">
                                        <ul className="list-disc pl-5 space-y-1">
                                            {result.errors.map((err: any, idx: number) => (
                                                <li key={idx}>Row {err.row}: {err.error}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}

                            <Button className="w-full" onClick={onClose}>Done</Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
