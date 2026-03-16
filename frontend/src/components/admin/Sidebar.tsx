import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminSidebar() {
    const pathname = usePathname();

    const navigation = [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
        { name: 'Products', href: '/admin/products', icon: Package },
    ];

    return (
        <div className="flex h-full w-64 flex-col bg-white border-r">
            <div className="flex h-16 items-center px-6 border-b">
                <Link href="/admin" className="flex items-center gap-2">
                    <span className="text-xl font-bold text-primary">Pranjay Admin</span>
                </Link>
            </div>
            <nav className="flex-1 space-y-1 px-4 py-4">
                {navigation.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
                                className={cn(
                                    "mr-3 h-5 w-5 flex-shrink-0",
                                    isActive ? "text-primary" : "text-slate-400"
                                )}
                                aria-hidden="true"
                            />
                            {item.name}
                        </Link>
                    )
                })}
            </nav>
            <div className="p-4 border-t">
                <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-900">
                    &larr; Back to Shop
                </Link>
            </div>
        </div>
    );
}
