'use client';

import { useAuthStore } from '@/store/auth-store';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/admin/Sidebar';
import { Menu, LayoutDashboard } from 'lucide-react';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const pathname = usePathname();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Close sidebar on route change
    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    if (!mounted || !_hasHydrated) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    Initializing...
                </div>
            </div>
        );
    }

    const isLoginPage = pathname === '/admin/login';
    const role = (user?.role || '').toString().toLowerCase();
    const isAdmin = isAuthenticated && (role === 'admin' || role === 'super_admin');
    const isApprovedSeller = isAuthenticated && user?.seller_status === 'approved' && user?.user_type === 'seller';
    const isAllowed = isAdmin || isApprovedSeller;

    if (!isLoginPage && !isAllowed) {
        router.push('/admin/login');
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Redirecting...</div>;
    }

    if (isLoginPage) {
        return <>{children}</>;
    }

    // Page title from pathname for mobile header
    const pageTitle = (() => {
        if (pathname === '/admin') return 'Dashboard';
        const segment = pathname.split('/').filter(Boolean)[1];
        if (!segment) return 'Admin';
        return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    })();

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50">
            {/* ── Desktop Sidebar (always visible ≥ md) ────────────────────── */}
            <aside className="hidden md:flex md:flex-shrink-0">
                <AdminSidebar />
            </aside>

            {/* ── Mobile Sidebar Overlay ─────────────────────────────────────── */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    {/* Drawer — slides in from left */}
                    <div
                        className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-2xl z-50"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                    </div>
                </div>
            )}

            {/* ── Main content area ──────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile Top Bar */}
                <header className="md:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-slate-200 shadow-sm flex-shrink-0 z-30">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                        aria-label="Open navigation menu"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                    <span className="text-base font-bold text-slate-800">{pageTitle}</span>
                    <div className="w-9" /> {/* Spacer for balance */}
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto">
                    <div className="p-4 md:p-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
