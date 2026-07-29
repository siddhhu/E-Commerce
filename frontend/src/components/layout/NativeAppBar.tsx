'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, ShoppingCart, Sparkles } from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { cn } from '@/lib/utils';
import { SELLER_DISPLAY_NAME } from '@/lib/seller-branding';

const TITLE_BY_PATH: Record<string, string> = {
    '/': 'Home',
    '/products': 'Shop',
    '/cart': 'Cart',
    '/orders': 'Orders',
    '/profile': 'Profile',
    '/wishlist': 'Wishlist',
    '/search': 'Search',
};

function pageTitle(pathname: string): string {
    if (TITLE_BY_PATH[pathname]) return TITLE_BY_PATH[pathname];
    if (pathname.startsWith('/products/')) return 'Product';
    if (pathname.startsWith('/orders/')) return 'Order';
    return SELLER_DISPLAY_NAME;
}

export function NativeAppBar() {
    const pathname = usePathname();
    const router = useRouter();
    const cartCount = useCartStore((state) =>
        state.items.reduce((sum, item) => sum + item.quantity, 0)
    );

    const title = pageTitle(pathname);
    const isHome = pathname === '/';

    return (
        <header className="native-app-bar sticky top-0 z-50 md:hidden">
            <div className="native-app-bar-inner pt-safe">
                <div className="flex h-14 items-center justify-between gap-3 px-4">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <Link href="/" className="flex shrink-0 items-center gap-2">
                            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-[#e91e63] via-[#d81b60] to-[#ad1457] text-xs font-black text-white shadow-lg shadow-pink-300/40">
                                PH
                            </span>
                        </Link>
                        <div className="min-w-0">
                            {!isHome && (
                                <p className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-pink-400">
                                    {SELLER_DISPLAY_NAME}
                                </p>
                            )}
                            <h1 className={cn(
                                'truncate font-extrabold text-slate-900',
                                isHome ? 'text-lg tracking-tight' : 'text-base leading-tight'
                            )}>
                                {isHome ? SELLER_DISPLAY_NAME : title}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => router.push('/search')}
                            className="grid h-10 w-10 place-items-center rounded-xl text-slate-600 active:scale-95 active:bg-pink-50 transition-transform"
                            aria-label="Search"
                        >
                            <Search className="h-5 w-5" />
                        </button>
                        <Link
                            href="/cart"
                            prefetch
                            className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-600 active:scale-95 active:bg-pink-50 transition-transform"
                            aria-label="Cart"
                        >
                            <ShoppingCart className="h-5 w-5" />
                            {cartCount > 0 && (
                                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#e91e63] px-1 text-[10px] font-bold text-white">
                                    {cartCount > 99 ? '99+' : cartCount}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>

                {isHome && (
                    <div className="flex items-center gap-2 px-4 pb-2.5">
                        <Sparkles className="h-3.5 w-3.5 text-[#e91e63]" />
                        <p className="text-xs font-semibold text-slate-600">
                            Salon essentials · Wholesale beauty · Live discounts
                        </p>
                    </div>
                )}
            </div>
        </header>
    );
}
