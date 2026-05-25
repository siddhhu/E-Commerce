'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, Package, Image as ImageIcon, Users, LogOut, TicketPercent, Store, Tags, Settings, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';

interface AdminSidebarProps {
    open?: boolean;
    onClose?: () => void;
}

export function AdminSidebar({ open, onClose }: AdminSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { logout, user } = useAuthStore();

    const role = (user?.role || '').toString().toLowerCase();
    const isAdmin = role === 'admin' || role === 'super_admin';
    const isSellerOnly = !isAdmin && user?.seller_status === 'approved' && user?.user_type === 'seller';

    const adminNav = [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
        { name: 'Products', href: '/admin/products', icon: Package },
        { name: 'Categories', href: '/admin/categories', icon: Tags },
        { name: 'Banners', href: '/admin/banners', icon: ImageIcon },
        { name: 'Promo Codes', href: '/admin/promo-codes', icon: TicketPercent },
        { name: 'Users', href: '/admin/users', icon: Users },
        { name: 'Settings', href: '/admin/settings', icon: Settings },
    ];

    const sellerNav = [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
        { name: 'Products', href: '/admin/products', icon: Package },
        { name: 'Categories', href: '/admin/categories', icon: Tags },
        { name: 'Settings', href: '/admin/settings', icon: Settings },
    ];

    const navigation = isSellerOnly ? sellerNav : adminNav;

    const handleLogout = () => {
        logout();
        onClose?.();
        router.push('/admin/login');
    };

    const handleNavClick = () => {
        onClose?.();
    };

    return (
        <div className="flex h-full w-64 flex-col bg-white border-r">
            {/* Header */}
            <div className="flex h-16 items-center px-5 border-b gap-2 justify-between">
                {isSellerOnly ? (
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Store className="h-5 w-5 text-primary" />
                        </div>
                        <span className="text-lg font-bold text-primary">Seller Portal</span>
                    </div>
                ) : (
                    <Link href="/admin" className="flex items-center gap-2" onClick={handleNavClick}>
                        <span className="text-xl font-bold text-primary">Pranjay Admin</span>
                    </Link>
                )}
                {/* Close button — visible only on mobile when drawer is open */}
                {onClose && (
                    <button
                        onClick={onClose}
                        className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                        aria-label="Close menu"
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
                {navigation.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(`${item.href}/`));
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={handleNavClick}
                            className={cn(
                                "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all",
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

            {/* Footer */}
            <div className="p-4 border-t space-y-3">
                {user && (
                    <div className="px-2 py-2 rounded-lg bg-slate-50 border border-slate-100">
                        <p className="text-xs font-bold text-slate-700 truncate">
                            {isSellerOnly
                                ? (user.business_name || user.full_name || 'Seller')
                                : (user.full_name || user.email)}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mt-0.5">
                            {isSellerOnly ? 'Approved Seller' : user.role?.replace('_', ' ')}
                        </p>
                        {isSellerOnly && user.seller_username && (
                            <p className="text-[10px] text-primary/70 truncate mt-0.5">{user.seller_username}</p>
                        )}
                    </div>
                )}

                <div className="flex items-center justify-between">
                    {!isSellerOnly && (
                        <Link href="/" onClick={handleNavClick} className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
                            ← Back to Shop
                        </Link>
                    )}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-medium transition-colors ml-auto"
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
