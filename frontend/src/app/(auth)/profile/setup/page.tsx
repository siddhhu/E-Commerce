'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, User as UserIcon, Upload, CheckCircle2, Clock, XCircle, FileText, Mail } from 'lucide-react';
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
    const [businessType, setBusinessType] = useState<'seller' | 'customer'>('customer');
    const [businessName, setBusinessName] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [gstNumber, setGstNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Step: 'profile' → fill details, 'invoice' → upload document (sellers only)
    const [step, setStep] = useState<'profile' | 'invoice'>('profile');
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
    const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isAuthLoading) {
            if (!isAuthenticated) {
                router.push('/login');
                return;
            }
            // Pre-fill if partially set up
            if (user?.full_name && user.full_name !== user.phone) {
                setName(user.full_name);
            }
            if (user?.contact_email) setContactEmail(user.contact_email);
            if (user?.business_name) setBusinessName(user.business_name);
            if (user?.gst_number) setGstNumber(user.gst_number);
            if (user?.user_type) setBusinessType(user.user_type as 'seller' | 'customer');

            // If seller and already has pending/approved status, go straight to invoice step
            if (user?.user_type === 'seller' && user?.seller_status && user.seller_status !== 'none') {
                setStep('invoice');
            }
        }
    }, [isAuthenticated, isAuthLoading, user, router]);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast({ title: 'Name required', description: 'Please enter your full name', variant: 'destructive' });
            return;
        }

        // Basic email validation if provided
        if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
            toast({ title: 'Invalid email', description: 'Please enter a valid email address', variant: 'destructive' });
            return;
        }

        // GST is mandatory for sellers — validate format
        if (businessType === 'seller') {
            if (!gstNumber.trim()) {
                toast({ title: 'GST Number required', description: 'Please enter your 15-digit GST number to register as a seller.', variant: 'destructive' });
                return;
            }
            const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
            if (!GST_REGEX.test(gstNumber.trim())) {
                toast({ title: 'Invalid GST Number', description: 'GST must be 15 characters: e.g. 27AABCU9603R1ZV (2 digits + 5 letters + 4 digits + 4 chars)', variant: 'destructive' });
                return;
            }
        }

        setIsLoading(true);
        try {
            const updatedUser = await authApi.updateProfile({
                full_name: name.trim(),
                user_type: businessType,
                business_name: businessName.trim() || undefined,
                contact_email: contactEmail.trim() || undefined,
                gst_number: gstNumber.trim() || undefined,
            });
            setUser(updatedUser);

            if (businessType === 'seller') {
                setStep('invoice');
            } else {
                toast({ title: 'Profile saved!', description: 'Welcome to Pranjay!' });
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
                description: 'Please upload your business registration document.',
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
                description: contactEmail
                    ? `Your seller application is under review. We'll email you at ${contactEmail} once approved.`
                    : 'Your seller application is under review. Contact pawantheblizz@gmail.com to follow up.',
            });
            router.push('/seller/pending');
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

    // ── Invoice Upload / Status Step ────────────────────────────────────────
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
                                ? '⏳ Application Under Review'
                                : sellerStatus === 'approved'
                                ? '✅ Seller Account Active'
                                : sellerStatus === 'rejected'
                                ? '❌ Application Rejected'
                                : '📄 Upload Business Document'}
                        </CardTitle>
                        <CardDescription>
                            {sellerStatus === 'pending'
                                ? 'Your application is being reviewed by our team.'
                                : sellerStatus === 'approved'
                                ? 'Your seller account is active. Log in with your seller credentials.'
                                : sellerStatus === 'rejected'
                                ? 'Your application was rejected. Contact the admin for details.'
                                : 'Upload your GST certificate or business registration document to apply as a seller.'}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {/* Pending */}
                        {sellerStatus === 'pending' && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                                <p className="font-semibold mb-1">Application Submitted ✓</p>
                                <p>
                                    {user?.contact_email
                                        ? `We'll email your approval status to ${user.contact_email}.`
                                        : 'Contact '}{' '}
                                    {!user?.contact_email && (
                                        <a href="mailto:pawantheblizz@gmail.com" className="underline font-medium">
                                            pawantheblizz@gmail.com
                                        </a>
                                    )}{' '}
                                    {!user?.contact_email && 'to follow up on your application approval.'}
                                </p>
                            </div>
                        )}

                        {/* Approved */}
                        {sellerStatus === 'approved' && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
                                <p className="font-semibold mb-1">🎉 You're an approved seller!</p>
                                <p>
                                    {user?.contact_email
                                        ? `Your login credentials were sent to ${user.contact_email}.`
                                        : 'The admin will share your login credentials with you manually.'}{' '}
                                    Use them to log in via the admin login page.
                                </p>
                            </div>
                        )}

                        {/* Rejected */}
                        {sellerStatus === 'rejected' && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
                                <p className="font-semibold mb-1">Application Not Approved</p>
                                <p>
                                    Please contact{' '}
                                    <a href="mailto:pawantheblizz@gmail.com" className="underline font-medium">
                                        pawantheblizz@gmail.com
                                    </a>{' '}
                                    for details or to re-apply.
                                </p>
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
                                            <p className="text-xs text-muted-foreground">GST cert / shop license / trade license</p>
                                            <p className="text-xs text-muted-foreground">PDF, JPG, or PNG • Max 10MB</p>
                                        </div>
                                    )}
                                </div>

                                {!user?.contact_email && (
                                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                                        💡 <strong>Tip:</strong> Go back and add your email to receive approval notifications automatically.
                                    </div>
                                )}

                                <Button
                                    className="w-full"
                                    onClick={handleSubmitSellerApplication}
                                    disabled={!invoiceFile || isUploadingInvoice}
                                >
                                    {isUploadingInvoice && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Submit Seller Application
                                </Button>

                                <Button
                                    variant="ghost"
                                    className="w-full text-muted-foreground"
                                    onClick={() => setStep('profile')}
                                >
                                    ← Back to Profile
                                </Button>

                                <p className="text-xs text-center text-muted-foreground">
                                    After submission, contact{' '}
                                    <a href="mailto:pawantheblizz@gmail.com" className="underline">
                                        pawantheblizz@gmail.com
                                    </a>{' '}
                                    if you need to follow up.
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

                        {/* Account Type — shown first */}
                        <div className="space-y-2">
                            <Label>Account Type</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setBusinessType('customer')}
                                    className={`p-3 rounded-lg border-2 transition-all text-sm font-medium text-left ${
                                        businessType === 'customer'
                                        ? 'border-primary bg-primary/5 text-primary'
                                        : 'border-muted bg-background hover:border-muted-foreground/30'
                                    }`}
                                >
                                    🛍️ <span className="block text-xs font-normal mt-1 text-muted-foreground">I want to buy products</span>
                                    Customer
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBusinessType('seller')}
                                    className={`p-3 rounded-lg border-2 transition-all text-sm font-medium text-left ${
                                        businessType === 'seller'
                                        ? 'border-primary bg-primary/5 text-primary'
                                        : 'border-muted bg-background hover:border-muted-foreground/30'
                                    }`}
                                >
                                    🏪 <span className="block text-xs font-normal mt-1 text-muted-foreground">I want to sell wholesale</span>
                                    Seller
                                </button>
                            </div>
                            {businessType === 'seller' && (
                                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded px-3 py-2">
                                    📋 Seller accounts require admin approval. You'll upload your business document in the next step.
                                </p>
                            )}
                        </div>

                        {/* Full Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name *</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="Your full name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        {/* Email for notifications */}
                        <div className="space-y-2">
                            <Label htmlFor="contact_email" className="flex items-center gap-1">
                                <Mail className="h-3.5 w-3.5" />
                                Email{' '}
                                <span className="text-muted-foreground font-normal text-xs ml-1">(optional — for notifications)</span>
                            </Label>
                            <Input
                                id="contact_email"
                                type="email"
                                placeholder="your@email.com"
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                            />
                            {businessType === 'seller' && (
                                <p className="text-xs text-muted-foreground">
                                    Seller approvals will be sent to this email. Without an email, admin will share credentials manually.
                                </p>
                            )}
                        </div>

                        {/* Seller-specific fields */}
                        {businessType === 'seller' && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="business_name">Business / Shop Name *</Label>
                                    <Input
                                        id="business_name"
                                        type="text"
                                        placeholder="Your shop or company name"
                                        value={businessName}
                                        onChange={(e) => setBusinessName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gst_number" className="flex items-center gap-1">
                                        GST Number
                                        <span className="text-red-500 ml-0.5">*</span>
                                        {gstNumber.length === 15 && /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstNumber) && (
                                            <span className="text-green-600 text-xs font-normal ml-2">✓ Valid</span>
                                        )}
                                    </Label>
                                    <Input
                                        id="gst_number"
                                        type="text"
                                        placeholder="e.g. 27AABCU9603R1ZV"
                                        value={gstNumber}
                                        onChange={(e) => setGstNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                        className={`font-mono ${
                                            gstNumber.length > 0 && gstNumber.length < 15
                                                ? 'border-amber-400 focus-visible:ring-amber-400'
                                                : gstNumber.length === 15 && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstNumber)
                                                ? 'border-red-400 focus-visible:ring-red-400'
                                                : ''
                                        }`}
                                        maxLength={15}
                                        required
                                    />
                                    <div className="text-xs space-y-0.5">
                                        {gstNumber.length === 0 && (
                                            <p className="text-muted-foreground">Format: 2 digits (state) + 5 letters (PAN) + 4 digits + 1 letter + 1 char + Z + 1 char</p>
                                        )}
                                        {gstNumber.length > 0 && gstNumber.length < 15 && (
                                            <p className="text-amber-600">{15 - gstNumber.length} more characters needed</p>
                                        )}
                                        {gstNumber.length === 15 && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstNumber) && (
                                            <p className="text-red-500">Invalid GST format. Example: 27AABCU9603R1ZV</p>
                                        )}
                                        {gstNumber.length === 15 && /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstNumber) && (
                                            <p className="text-green-600">✓ Valid GST number</p>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {businessType === 'seller' ? 'Next: Upload Document →' : 'Save & Continue'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
