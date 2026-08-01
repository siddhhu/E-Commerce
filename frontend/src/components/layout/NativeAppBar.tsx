'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, Search, ShoppingCart, Sparkles } from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { cn } from '@/lib/utils';
import { hapticLight } from '@/lib/haptics';

const BRAND = 'Pranjay';

const ROOT_TABS = new Set(['/', '/products', '/cart', '/orders', '/profile', '/search', '/wishlist']);

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
    return BRAND;
}

export function NativeAppBar() {
    const pathname = usePathname();
    const router = useRouter();
    const cartCount = useCartStore((state) =>
        state.items.reduce((sum, item) => sum + item.quantity, 0)
    );

    const title = pageTitle(pathname);
    const isHome = pathname === '/';
    const showBack = !ROOT_TABS.has(pathname);

    const handleBack = () => {
        void hapticLight();
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back();
        } else {
            router.push('/products');
        }
    };

    return (
        <header className="native-app-bar sticky top-0 z-50 md:hidden">
            <div className="native-app-bar-inner pt-safe">
                <div className="flex h-14 items-center justify-between gap-3 px-4">
                    <div className="flex min-w-0 items-center gap-2.5">
                        {showBack ? (
                            <button
                                type="button"
                                onClick={handleBack}
                                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-700 active:scale-95 active:bg-pink-50 transition-transform"
                                aria-label="Go back"
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </button>
                        ) : (
                            <Link href="/" className="flex shrink-0 items-center gap-2">
                                <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-[#e91e63] via-[#d81b60] to-[#ad1457] text-sm font-black text-white shadow-lg shadow-pink-300/40">
                                    P
                                </span>
                            </Link>
                        )}
                        <div className="min-w-0">
                            {!isHome && (
                                <p className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-pink-400">
                                    {BRAND}
                                </p>
                            )}
                            <h1 className={cn(
                                'truncate font-extrabold text-slate-900',
                                isHome ? 'text-lg tracking-tight' : 'text-base leading-tight'
                            )}>
                                {isHome ? BRAND : title}
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
