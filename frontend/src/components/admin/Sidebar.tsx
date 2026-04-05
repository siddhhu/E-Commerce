'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, Package, Image as ImageIcon, Users, LogOut, TicketPercent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';

export function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { logout, user } = useAuthStore();

    const navigation = [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
        { name: 'Products', href: '/admin/products', icon: Package },
        { name: 'Banners', href: '/admin/banners', icon: ImageIcon },
        { name: 'Promo Codes', href: '/admin/promo-codes', icon: TicketPercent },
        { name: 'Users', href: '/admin/users', icon: Users },
    ];

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    return (
        <div className="flex h-full w-64 flex-col bg-white border-r">
            <div className="flex h-16 items-center px-6 border-b">
                <Link href="/admin" className="flex items-center gap-2">
                    <span className="text-xl font-bold text-primary">Pranjay Admin</span>
                </Link>
            </div>
            <nav className="flex-1 space-y-1 px-4 py-4">
                {navigation.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(`${item.href}/`));
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center px-4 py-3 text-sm font-medium rounded-md",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            <item.icon
                                className={cn("mr-3 h-5 w-5 flex-shrink-0", isActive ? "text-primary" : "text-slate-400")}
                                aria-hidden="true"
                            />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t space-y-3">
                {/* Admin user info */}
                {user && (
                    <div className="px-2 py-2 rounded-lg bg-slate-50 border border-slate-100">
                        <p className="text-xs font-bold text-slate-700 truncate">{user.full_name || user.email}</p>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">{user.role?.replace('_', ' ')}</p>
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-900">
                        &larr; Back to Shop
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
                        title="Logout"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}
