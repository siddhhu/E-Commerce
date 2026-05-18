'use client';

import { useAuthStore } from '@/store/auth-store';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SellerSidebar } from '@/components/seller/SellerSidebar';

export default function SellerGuard({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const pathname = usePathname();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    if (!mounted || !_hasHydrated) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    Loading...
                </div>
            </div>
        );
    }

    // Not logged in → send to admin login (seller logs in via admin/login)
    if (!isAuthenticated) {
        router.push('/admin/login');
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Redirecting...</div>;
    }

    const sellerStatus = user?.seller_status;
    const isSeller = user?.user_type === 'seller';
    const role = (user?.role || '').toString().toLowerCase();
    const isAdmin = role === 'admin' || role === 'super_admin';

    // Admins can see seller dashboard too if they want
    if (!isAdmin && !isSeller) {
        router.push('/');
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Redirecting...</div>;
    }

    // Seller not yet approved → pending page
    if (isSeller && !isAdmin && sellerStatus !== 'approved') {
        router.push('/seller/pending');
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Redirecting...</div>;
    }

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50">
            <SellerSidebar />
            <main className="flex-1 overflow-y-auto">
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
