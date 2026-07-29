'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, ShoppingCart, Package, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';

const NAV_ITEMS: Array<{
    href: string;
    label: string;
    icon: typeof Home;
    match: (path: string) => boolean;
    showBadge?: boolean;
}> = [
    { href: '/', label: 'Home', icon: Home, match: (path: string) => path === '/' },
    { href: '/products', label: 'Shop', icon: LayoutGrid, match: (path: string) => path.startsWith('/products') || path.startsWith('/search') },
    { href: '/cart', label: 'Cart', icon: ShoppingCart, match: (path: string) => path === '/cart', showBadge: true },
    { href: '/orders', label: 'Orders', icon: Package, match: (path: string) => path.startsWith('/orders') },
    { href: '/profile', label: 'Profile', icon: User, match: (path: string) => path === '/profile' || path.startsWith('/wishlist') },
];

const HIDDEN_PREFIXES = ['/checkout', '/login', '/admin', '/seller', '/profile/setup'];

export function MobileBottomNav() {
    const pathname = usePathname();
    const cartCount = useCartStore((state) =>
        state.items.reduce((sum, item) => sum + item.quantity, 0)
    );

    if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
        return null;
    }

    return (
        <nav
            className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-pink-100 bg-white/95 backdrop-blur-xl pb-safe shadow-[0_-8px_30px_rgba(236,72,153,0.08)]"
            aria-label="Main navigation"
        >
            <div className="grid grid-cols-5 h-16">
                {NAV_ITEMS.map(({ href, label, icon: Icon, match, showBadge }) => {
                    const active = match(pathname);
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                'relative flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors',
                                active ? 'text-[#e91e63]' : 'text-slate-500 hover:text-slate-800'
                            )}
                        >
                            <span className="relative">
                                <Icon className={cn('h-5 w-5', active && 'scale-110')} strokeWidth={active ? 2.5 : 2} />
                                {showBadge && cartCount > 0 && (
                                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#e91e63] px-1 text-[10px] font-bold text-white animate-in zoom-in duration-200">
                                        {cartCount > 99 ? '99+' : cartCount}
                                    </span>
                                )}
                            </span>
                            <span className={cn('text-[10px] font-semibold', active && 'font-bold')}>{label}</span>
                            {active && (
                                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-[#e91e63]" />
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
