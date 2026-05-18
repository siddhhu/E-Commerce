'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Package, ShoppingCart, User, LogOut, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';

export function SellerSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { logout, user } = useAuthStore();

    const navigation = [
        { name: 'Dashboard', href: '/seller/dashboard', icon: LayoutDashboard },
        { name: 'My Products', href: '/seller/products', icon: Package },
        { name: 'My Orders', href: '/seller/orders', icon: ShoppingCart },
        { name: 'My Profile', href: '/seller/profile', icon: User },
    ];

    const handleLogout = () => {
        logout();
        router.push('/admin/login');
    };

    return (
        <div className="flex h-full w-64 flex-col bg-white border-r">
            <div className="flex h-16 items-center px-6 border-b gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Store className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <p className="text-sm font-bold text-slate-800">Seller Portal</p>
                    <p className="text-[10px] text-slate-400">Pranjay Wholesale</p>
                </div>
            </div>

            <nav className="flex-1 space-y-1 px-4 py-4">
                {navigation.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/seller/dashboard' && pathname.startsWith(`${item.href}/`));
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
                {user && (
                    <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                        <p className="text-xs font-bold text-slate-700 truncate">{user.business_name || user.full_name || 'Seller'}</p>
                        <p className="text-[10px] uppercase tracking-wider text-primary/70 font-medium mt-0.5">Approved Seller</p>
                        {user.seller_username && (
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">{user.seller_username}</p>
                        )}
                    </div>
                )}
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-medium transition-colors w-full px-2"
                >
                    <LogOut className="h-4 w-4" />
                    Logout
                </button>
            </div>
        </div>
    );
}
