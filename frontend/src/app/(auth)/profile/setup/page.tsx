'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, User as UserIcon, Upload, CheckCircle2, Clock, XCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { authApi, usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

export default function ProfileSetupPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user, setUser, isAuthenticated, isLoading: isAuthLoading } = useAuthStore();

    const [name, setName] = useState('');
    const [businessType, setBusinessType] = useState<'seller' | 'customer'>('seller');
    const [businessName, setBusinessName] = useState('');
    const [gstNumber, setGstNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Seller invoice upload
    const [step, setStep] = useState<'profile' | 'invoice'>('profile');
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
    const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isAuthLoading) {
            if (!isAuthenticated) {
                router.push('/login');
            } else if (user?.full_name && user.full_name !== user.phone && user.full_name.trim() !== '') {
                // Already has a profile — if seller and pending/approved, skip setup
                if (user.user_type === 'seller' && user.seller_status && user.seller_status !== 'none') {
                    router.push('/');
                } else if (user.user_type === 'customer') {
                    router.push('/');
                }
                // If seller with seller_status === 'none', stay here to complete invoice
                if (user.user_type === 'seller' && (!user.seller_status || user.seller_status === 'none')) {
                    setStep('invoice');
                }
            }
        }
    }, [isAuthenticated, isAuthLoading, user, router]);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsLoading(true);
        try {
            const updatedUser = await authApi.updateProfile({
                full_name: name.trim(),
                user_type: businessType,
                business_name: businessName.trim() || undefined,
                gst_number: gstNumber.trim() || undefined,
            });
            setUser(updatedUser);

            if (businessType === 'seller') {
                // Move to invoice upload step
                setStep('invoice');
            } else {
                toast({
                    title: 'Profile Updated',
                    description: 'Welcome to Pranjay!',
                });
                router.push('/');
            }
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to save profile. Try again.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitSellerApplication = async () => {
        if (!invoiceFile) {
            toast({
                title: 'Document Required',
                description: 'Please upload your registration invoice or business document.',
                variant: 'destructive',
            });
            return;
        }
        setIsUploadingInvoice(true);
        try {
            const updatedUser = await usersApi.submitSellerApplication(invoiceFile);
            setUser(updatedUser);
            toast({
                title: '✅ Application Submitted!',
                description: 'Your seller application is under review. Contact admin@pranjay.com to follow up.',
            });
            router.push('/');
        } catch (error: any) {
            toast({
                title: 'Upload Failed',
                description: error.message || 'Could not upload document. Try again.',
                variant: 'destructive',
            });
        } finally {
            setIsUploadingInvoice(false);
        }
    };

    if (isAuthLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-pink-100 p-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // ── Invoice Upload Step ────────────────────────────────────────────────────
    if (step === 'invoice') {
        const sellerStatus = user?.seller_status;
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-pink-100 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="space-y-1 text-center">
                        <div className="mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-4 bg-primary/10">
                            {sellerStatus === 'pending' ? (
                                <Clock className="h-8 w-8 text-amber-500" />
                            ) : sellerStatus === 'approved' ? (
                                <CheckCircle2 className="h-8 w-8 text-green-500" />
                            ) : sellerStatus === 'rejected' ? (
                                <XCircle className="h-8 w-8 text-red-500" />
                            ) : (
                                <Upload className="h-8 w-8 text-primary" />
                            )}
                        </div>
                        <CardTitle className="text-2xl">
                            {sellerStatus === 'pending'
                                ? '⏳ Awaiting Approval'
                                : sellerStatus === 'approved'
                                ? '✅ Seller Account Active'
                                : sellerStatus === 'rejected'
                                ? '❌ Application Rejected'
                                : 'Upload Seller Document'}
                        </CardTitle>
                        <CardDescription>
                            {sellerStatus === 'pending'
                                ? 'Your application is under review. Contact admin@pranjay.com to follow up.'
                                : sellerStatus === 'approved'
                                ? 'Your seller account is approved. You can now list products.'
                                : sellerStatus === 'rejected'
                                ? 'Your application was rejected. Contact admin@pranjay.com for details.'
                                : 'Upload your business registration invoice or GST certificate to register as a seller.'}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {/* Pending banner */}
                        {sellerStatus === 'pending' && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                                <p className="font-semibold mb-1">Application Submitted!</p>
                                <p>
                                    Please contact{' '}
                                    <a href="mailto:admin@pranjay.com" className="underline font-medium">
                                        admin@pranjay.com
                                    </a>{' '}
                                    to ask the admin to approve your registration. Once approved, you'll receive login credentials.
                                </p>
                            </div>
                        )}

                        {/* Approved banner */}
                        {sellerStatus === 'approved' && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
                                <p className="font-semibold mb-1">🎉 You're an approved seller!</p>
                                <p>Your @pranjay.com credentials have been shared by the admin. Use them to log in on the seller login page.</p>
                            </div>
                        )}

                        {/* No status — show upload form */}
                        {(!sellerStatus || sellerStatus === 'none') && (
                            <div className="space-y-4">
                                <div
                                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                                        invoiceFile ? 'border-green-400 bg-green-50' : 'border-muted hover:border-primary/50'
                                    }`}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="application/pdf,image/jpeg,image/png"
                                        className="hidden"
                                        onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                                    />
                                    {invoiceFile ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <FileText className="h-8 w-8 text-green-600" />
                                            <p className="font-medium text-green-700">{invoiceFile.name}</p>
                                            <p className="text-xs text-green-600">{(invoiceFile.size / 1024).toFixed(0)} KB</p>
                                            <button
                                                type="button"
                                                className="text-xs text-muted-foreground underline"
                                                onClick={(e) => { e.stopPropagation(); setInvoiceFile(null); }}
                                            >
                                                Change file
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <Upload className="h-8 w-8 text-muted-foreground" />
                                            <p className="text-sm font-medium">Click to upload your document</p>
                                            <p className="text-xs text-muted-foreground">PDF, JPG, or PNG • Max 10MB</p>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                                    <strong>What to upload:</strong> GST certificate, shop registration certificate, trade license, or any valid business document.
                                </div>

                                <Button
                                    className="w-full"
                                    onClick={handleSubmitSellerApplication}
                                    disabled={!invoiceFile || isUploadingInvoice}
                                >
                                    {isUploadingInvoice && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Submit Application
                                </Button>

                                <p className="text-xs text-center text-muted-foreground">
                                    After submission, contact{' '}
                                    <a href="mailto:admin@pranjay.com" className="underline">
                                        admin@pranjay.com
                                    </a>{' '}
                                    to request approval.
                                </p>
                            </div>
                        )}

                        {(sellerStatus === 'pending' || sellerStatus === 'approved' || sellerStatus === 'rejected') && (
                            <Button variant="outline" className="w-full" onClick={() => router.push('/')}>
                                Back to Home
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ── Profile Details Step ───────────────────────────────────────────────────
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-pink-100 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 text-center">
                    <div className="mx-auto bg-primary/10 h-16 w-16 rounded-full flex items-center justify-center mb-4">
                        <UserIcon className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
                    <CardDescription>Help us personalize your experience</CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                        <div className="space-y-4 pt-2">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Account Type</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setBusinessType('seller')}
                                        className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                                            businessType === 'seller'
                                            ? 'border-primary bg-primary/5 text-primary'
                                            : 'border-muted bg-background hover:border-muted-foreground/30'
                                        }`}
                                    >
                                        🏪 Seller (Wholesale)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBusinessType('customer')}
                                        className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                                            businessType === 'customer'
                                            ? 'border-primary bg-primary/5 text-primary'
                                            : 'border-muted bg-background hover:border-muted-foreground/30'
                                        }`}
                                    >
                                        🛍️ Customer (Retail)
                                    </button>
                                </div>
                            </div>

                            {businessType === 'seller' && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="business_name">Business Name</Label>
                                        <Input
                                            id="business_name"
                                            type="text"
                                            placeholder="Your Shop / Company Name"
                                            value={businessName}
                                            onChange={(e) => setBusinessName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="gst_number">GST Number (optional)</Label>
                                        <Input
                                            id="gst_number"
                                            type="text"
                                            placeholder="e.g. 27AABCU9603R1ZV"
                                            value={gstNumber}
                                            onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                                            className="font-mono"
                                        />
                                    </div>
                                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700">
                                        <strong>📋 Next step:</strong> After saving your profile, you'll upload your business registration document for seller approval.
                                    </div>
                                </>
                            )}
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {businessType === 'seller' ? 'Next: Upload Document →' : 'Save Profile'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
