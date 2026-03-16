'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Phone, ArrowLeft } from 'lucide-react';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

declare global {
    interface Window {
        recaptchaVerifier: any;
    }
    const grecaptcha: any;
}

import { Suspense } from 'react';

function LoginForm() {
    const router = useRouter();
    const { toast } = useToast();
    const { setUser, setTokens } = useAuthStore();

    const searchParams = useSearchParams();
    const redirectUrl = searchParams.get('redirect') || '/';

    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

    useEffect(() => {
        if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
            console.error('CRITICAL: Firebase API Key is missing from environment variables!');
        }

        // Cleanup function for recaptcha
        return () => {
            if (window.recaptchaVerifier) {
                try {
                    window.recaptchaVerifier.clear();
                    window.recaptchaVerifier = null;
                } catch (e) {
                    console.error('Error clearing recaptcha:', e);
                }
            }
        };
    }, []);

    const initRecaptcha = () => {
        if (!window.recaptchaVerifier) {
            try {
                window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-wrapper', {
                    'size': 'invisible',
                    'callback': (response: any) => {
                        // reCAPTCHA solved
                    },
                    'expired-callback': () => {
                        toast({
                            title: 'reCAPTCHA Expired',
                            description: 'Please try again.',
                            variant: 'destructive',
                        });
                    }
                });
            } catch (e) {
                console.error('Recaptcha Init Error:', e);
            }
        }
    };

    const formatPhoneNumber = (number: string) => {
        if (number.startsWith('+')) return number;
        if (number.length === 10) return `+91${number}`;
        return `+${number}`;
    };

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phone) return;

        setIsLoading(true);
        try {
            const formattedPhone = formatPhoneNumber(phone);
            initRecaptcha();
            const appVerifier = window.recaptchaVerifier;

            const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
            setConfirmationResult(confirmation);

            toast({
                title: 'OTP Sent',
                description: 'Check your phone for the verification code.',
            });
            setStep('otp');
        } catch (error: any) {
            console.error('SMS Send Error:', error);

            // If it's an app-credential error, it's often fixed by clearing the verifier
            if (window.recaptchaVerifier) {
                try {
                    window.recaptchaVerifier.clear();
                    window.recaptchaVerifier = null;
                } catch (e) { }
            }

            let errorMessage = 'Failed to send OTP. Try again.';
            if (error.code === 'auth/invalid-app-credential') {
                const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'your domain';
                errorMessage = `Firebase Error: Invalid App Credential. This means Firebase is rejecting your request.
                Please ensure:
                1. Your exact domain (${currentOrigin}) is in the 'Authorized Domains' list in the Firebase Console.
                2. Your API Key is NOT restricted in the Google Cloud Console (console.cloud.google.com/apis/credentials).
                3. The 'Identity Toolkit API' is enabled in your Google Cloud Project.
                4. If you recently changed these settings, please wait 5-10 minutes and try again.`;
            } else if (error.code === 'auth/captcha-check-failed') {
                errorMessage = 'reCAPTCHA check failed. Please refresh and try again. Ensure reCAPTCHA is not blocked by your browser extensions.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many requests. SMS delivery to this number has been temporarily blocked by Firebase.';
            }

            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp || !confirmationResult) return;

        setIsLoading(true);
        try {
            // Verify with Firebase
            const result = await confirmationResult.confirm(otp);
            const user = result.user;
            const idToken = await user.getIdToken();

            // Send Firebase token to our backend
            const response = await authApi.verifyFirebaseToken(idToken);

            setUser(response.user);
            setTokens(response.access_token, response.refresh_token);

            toast({
                title: 'Welcome!',
                description: 'You have successfully logged in.',
            });

            // Redirect to the originally requested page, or home/admin/profile setup
            if (!response.user.full_name || response.user.full_name.trim() === '' || response.user.full_name === response.user.phone) {
                router.push('/profile/setup');
            } else if (redirectUrl !== '/') {
                router.push(redirectUrl);
            } else if (response.user.role === 'admin' || response.user.role === 'super_admin') {
                router.push('/admin');
            } else {
                router.push('/');
            }
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Invalid OTP',
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
                    <Link href="/" className="inline-block mb-4">
                        <span className="text-3xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
                            Pranjay
                        </span>
                    </Link>
                    <CardTitle className="text-2xl">
                        {step === 'phone' ? 'Welcome back' : 'Enter verification code'}
                    </CardTitle>
                    <CardDescription>
                        {step === 'phone'
                            ? 'Enter your phone number to receive a verification code'
                            : `We sent a code to ${phone}`}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <div id="recaptcha-wrapper"></div>
                    {step === 'phone' ? (
                        <form onSubmit={handleSendOtp} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder="9876543210"
                                        className="pl-10"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                        required
                                    />
                                </div>
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send OTP
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="otp">Verification Code</Label>
                                <Input
                                    id="otp"
                                    type="text"
                                    placeholder="123456"
                                    className="text-center text-2xl tracking-[0.5em]"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Verify
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                className="w-full"
                                onClick={() => {
                                    setStep('phone');
                                    setOtp('');
                                }}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Use different number
                            </Button>
                        </form>
                    )}
                </CardContent>

                <CardFooter className="flex flex-col space-y-4">
                    <div className="text-sm text-muted-foreground text-center">
                        By continuing, you agree to our{' '}
                        <Link href="/terms" className="text-primary hover:underline">
                            Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="text-primary hover:underline">
                            Privacy Policy
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
