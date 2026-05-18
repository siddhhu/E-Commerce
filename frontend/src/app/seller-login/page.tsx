'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Store, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

export default function SellerLoginPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { setTokens, setUser } = useAuthStore();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password) return;

        setIsLoading(true);
        try {
            const response = await authApi.sellerLogin(username.trim(), password);
            // Persist tokens
            if (typeof window !== 'undefined') {
                localStorage.setItem('access_token', response.access_token);
                localStorage.setItem('refresh_token', response.refresh_token);
            }
            setUser(response.user);
            toast({
                title: '✅ Welcome back!',
                description: `Logged in as ${response.user.business_name || response.user.full_name || username}`,
            });
            router.push('/');
        } catch (error: any) {
            toast({
                title: 'Login Failed',
                description: error.message || 'Invalid credentials or account not approved.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-pink-100 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 text-center">
                    <div className="mx-auto bg-primary/10 h-16 w-16 rounded-full flex items-center justify-center mb-4">
                        <Store className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Seller Login</CardTitle>
                    <CardDescription>
                        Log in with your Pranjay seller credentials
                        <br />
                        <span className="text-xs">
                            (Credentials provided by admin after approval)
                        </span>
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="seller-username">Seller Username</Label>
                            <Input
                                id="seller-username"
                                type="email"
                                placeholder="yourbrand1234@pranjay.com"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                autoComplete="username"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="seller-password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="seller-password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Your seller password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sign In as Seller
                        </Button>
                    </form>

                    <div className="mt-6 space-y-3">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">Or</span>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                            <p className="font-semibold mb-1">Don't have seller credentials?</p>
                            <p>
                                Register using your phone via the{' '}
                                <Link href="/login" className="underline font-medium">
                                    regular login
                                </Link>
                                , then upload your seller document on your profile page. Contact{' '}
                                <a href="mailto:admin@pranjay.com" className="underline font-medium">
                                    admin@pranjay.com
                                </a>{' '}
                                to request approval.
                            </p>
                        </div>

                        <p className="text-center text-sm text-muted-foreground">
                            Regular customer?{' '}
                            <Link href="/login" className="text-primary hover:underline font-medium">
                                Login here
                            </Link>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
