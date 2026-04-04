'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

export default function ProfileSetupPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user, setUser, isAuthenticated, isLoading: isAuthLoading } = useAuthStore();

    const [name, setName] = useState('');
    const [businessType, setBusinessType] = useState<'seller' | 'customer'>('seller');
    const [businessName, setBusinessName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // If not authenticated or already has a valid name, redirect
        if (!isAuthLoading) {
            if (!isAuthenticated) {
                router.push('/login');
            } else if (user?.full_name && user.full_name !== user.phone && user.full_name.trim() !== '') {
                router.push('/');
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
                business_name: businessName.trim() || undefined
            });
            setUser(updatedUser);

            toast({
                title: 'Profile Updated',
                description: `Welcome to Pranjay as a ${businessType}!`,
            });

            router.push('/');
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

    if (isAuthLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-pink-100 p-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-pink-100 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 text-center">
                    <div className="mx-auto bg-primary/10 h-16 w-16 rounded-full flex items-center justify-center mb-4">
                        <UserIcon className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
                    <CardDescription>
                        Help us personalize your experience
                    </CardDescription>
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
                                <Label>Business Type</Label>
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
                                        Seller (Wholesale)
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
                                        Customer (Retail)
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="business_name">Business Name (Optional)</Label>
                                <Input
                                    id="business_name"
                                    type="text"
                                    placeholder="Your Shop Name"
                                    value={businessName}
                                    onChange={(e) => setBusinessName(e.target.value)}
                                />
                            </div>

                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Continue
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
