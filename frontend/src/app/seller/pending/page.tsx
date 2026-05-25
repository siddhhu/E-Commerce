'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, XCircle, Mail, Phone, LogOut, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';

export default function SellerPendingPage() {
    const { user, isAuthenticated, _hasHydrated, logout } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        if (!_hasHydrated) return;

        if (!isAuthenticated) {
            router.push('/login');
            return;
        }

        // If user got approved while on this page, redirect to dashboard
        if (user?.seller_status === 'approved') {
            router.push('/seller/dashboard');
            return;
        }

        // If this is a customer, send them home
        if (user?.user_type !== 'seller') {
            router.push('/');
        }
    }, [_hasHydrated, isAuthenticated, user, router]);

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    const isRejected = user?.seller_status === 'rejected';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-pulse" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-pink-500/5 blur-3xl animate-pulse delay-1000" />
            </div>

            <div className="relative w-full max-w-lg">
                {/* Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 shadow-2xl text-center space-y-6">

                    {/* Icon */}
                    <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center ${
                        isRejected ? 'bg-red-500/15 border-2 border-red-500/30' : 'bg-amber-500/15 border-2 border-amber-500/30'
                    }`}>
                        {isRejected
                            ? <XCircle className="h-12 w-12 text-red-400" />
                            : <Clock className="h-12 w-12 text-amber-400 animate-pulse" />
                        }
                    </div>

                    {/* Heading */}
                    <div>
                        <h1 className={`text-3xl font-bold ${isRejected ? 'text-red-300' : 'text-amber-300'}`}>
                            {isRejected ? 'Application Not Approved' : 'Application Under Review'}
                        </h1>
                        <p className="text-slate-400 mt-2 text-base leading-relaxed">
                            {isRejected
                                ? 'Your seller application was not approved at this time. Please contact us to understand why or to re-apply.'
                                : 'Your seller application has been submitted and is being reviewed by our team. You\'ll be notified once a decision is made.'
                            }
                        </p>
                    </div>

                    {/* Status timeline */}
                    {!isRejected && (
                        <div className="bg-white/5 rounded-2xl p-5 text-left space-y-4">
                            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Application Status</h2>
                            <div className="space-y-3">
                                {[
                                    { label: 'Account Created', done: true },
                                    { label: 'Business Document Uploaded', done: !!user?.seller_invoice_url },
                                    { label: 'Admin Review', done: false, active: true },
                                    { label: 'Seller Credentials Issued', done: false },
                                ].map((step, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                                            step.done
                                                ? 'bg-green-500/20 border border-green-500/50'
                                                : step.active
                                                ? 'bg-amber-500/20 border border-amber-500/50 animate-pulse'
                                                : 'bg-white/5 border border-white/10'
                                        }`}>
                                            {step.done
                                                ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                                                : step.active
                                                ? <Clock className="w-3.5 h-3.5 text-amber-400" />
                                                : <div className="w-2 h-2 rounded-full bg-slate-600" />
                                            }
                                        </div>
                                        <span className={`text-sm ${step.done ? 'text-green-300' : step.active ? 'text-amber-300 font-medium' : 'text-slate-500'}`}>
                                            {step.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Info box */}
                    <div className={`rounded-2xl p-5 text-left ${isRejected ? 'bg-red-500/10 border border-red-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
                        <p className={`text-sm font-semibold mb-3 ${isRejected ? 'text-red-300' : 'text-amber-300'}`}>
                            {isRejected ? '❌ Not Approved — What to do next:' : '⏳ What happens next:'}
                        </p>
                        <ul className="space-y-2 text-sm text-slate-300">
                            {isRejected ? (
                                <>
                                    <li>• Contact us to understand the reason for rejection</li>
                                    <li>• Ensure your business documents are valid</li>
                                    <li>• You can re-apply with updated documents</li>
                                </>
                            ) : (
                                <>
                                    <li>• Our team will review your business document</li>
                                    <li>• Once approved, you'll receive login credentials</li>
                                    {user?.contact_email
                                        ? <li>• Credentials will be sent to <strong className="text-white">{user.contact_email}</strong></li>
                                        : <li>• Admin will share your credentials manually</li>
                                    }
                                    <li>• You can then access your full Seller Dashboard</li>
                                </>
                            )}
                        </ul>
                    </div>

                    {/* Contact section */}
                    <div className="border-t border-white/10 pt-5 space-y-3">
                        <p className="text-sm text-slate-400">For early access or queries, contact:</p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <a
                                href="mailto:support@admin.com"
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-slate-300 hover:text-white transition-all"
                            >
                                <Mail className="h-4 w-4 text-primary" />
                                support@admin.com
                            </a>
                            <a
                                href="tel:+91XXXXXXXXXX"
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-slate-300 hover:text-white transition-all"
                            >
                                <Phone className="h-4 w-4 text-primary" />
                                Request Early Access
                            </a>
                        </div>
                    </div>

                    {/* Logout */}
                    <Button
                        variant="ghost"
                        className="w-full text-slate-500 hover:text-slate-300 hover:bg-white/5 gap-2"
                        onClick={handleLogout}
                    >
                        <LogOut className="h-4 w-4" />
                        Sign out
                    </Button>
                </div>

                <p className="text-center text-xs text-slate-600 mt-6">
                    Pranjay Wholesale Platform · Seller Portal
                </p>
            </div>
        </div>
    );
}
