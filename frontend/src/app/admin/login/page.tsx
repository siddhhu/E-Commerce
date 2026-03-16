'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldCheck } from 'lucide-react';

export default function AdminLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { adminLogin } = useAuthStore();
    const { toast } = useToast();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast({
                title: 'Error',
                description: 'Please enter both email and password.',
                variant: 'destructive',
            });
            return;
        }

        setIsLoading(true);
        try {
            const success = await adminLogin(email, password);
            if (success) {
                toast({
                    title: 'Welcome Back',
                    description: 'Successfully authenticated as administrator.',
                });
                router.push('/admin');
            }
        } catch (error: any) {
            toast({
                title: 'Access Denied',
                description: error.response?.data?.detail || 'Invalid email or password.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="absolute top-8 left-8 text-white flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <span className="font-bold text-xl tracking-tight">Pranjay Admin UI</span>
            </div>

            <Card className="w-full max-w-md shadow-2xl border-slate-800 bg-slate-950 text-slate-100">
                <CardHeader className="space-y-1 pb-8 pt-8">
                    <CardTitle className="text-3xl font-bold tracking-tight text-center">Admin Portal</CardTitle>
                    <CardDescription className="text-center text-slate-400">
                        Enter your secure administrative credentials
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-300">Admin Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@pranjay.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                                className="bg-slate-900 border-slate-700 focus-visible:ring-primary text-slate-100 placeholder:text-slate-600"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-slate-300">Password</Label>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                                className="bg-slate-900 border-slate-700 focus-visible:ring-primary text-slate-100"
                                required
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="pt-6 pb-8">
                        <Button 
                            type="submit" 
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Authenticating...
                                </>
                            ) : (
                                'Secure Login'
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
