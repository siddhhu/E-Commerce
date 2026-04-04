'use client';

import { useAuthStore } from '@/store/auth-store';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/admin/Sidebar';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const pathname = usePathname();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || !_hasHydrated) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium">
            <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                Initializing...
            </div>
        </div>;
    }

    const isLoginPage = pathname === '/admin/login';
    const role = (user?.role || '').toString().toLowerCase();
    const isAdmin = isAuthenticated && (role === 'admin' || role === 'super_admin');

    if (!isLoginPage && !isAdmin) {
        router.push('/admin/login');
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Redirecting...</div>;
    }
    
    // If it's the login page, just render children without sidebar
    if (isLoginPage) {
        return <>{children}</>;
    }

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50">
            <AdminSidebar />
            <main className="flex-1 overflow-y-auto">
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
