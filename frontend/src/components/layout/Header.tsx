'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingCart, Heart, Menu, Search, X, ChevronDown, Sparkles } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

import { categoriesApi, CategoryRead, SearchIndexItem } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { useOrderStore } from '@/store/order-store';
import { useAuthStore } from '@/store/auth-store';
import { useSearchStore } from '@/store/search-store';
import { cn, formatPrice } from '@/lib/utils';

export function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchIndexItem[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [categories, setCategories] = useState<CategoryRead[]>([]);
    const [categoriesOpen, setCategoriesOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const mobileSearchRef = useRef<HTMLDivElement>(null);
    
    const pathname = usePathname();
    const router = useRouter();

    const cartItemCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
    const wishlistCount = useWishlistStore((state) => state.items.length);
    const { isAuthenticated, user, logout } = useAuthStore();
    const clearCart = useCartStore((state) => state.clearCart);
    const clearWishlist = useWishlistStore((state) => state.clearWishlist);
    const clearOrders = useOrderStore((state) => state.clearOrders);
    const { loadIndex, search: searchIndex } = useSearchStore();

    const navLinks = [
        { href: '/', label: 'Home' },
        { href: '/orders', label: 'My Orders' },
        { href: '/profile', label: 'Profile' },
    ];

    useEffect(() => {
        async function fetchCategories() {
            try {
                const data = await categoriesApi.list();
                setCategories(data);
            } catch (err) {
                console.error('Failed to fetch categories:', err);
            }
        }
        fetchCategories();
        // Preload search index in background
        loadIndex();
    }, []);

    // Live search as user types
    useEffect(() => {
        if (searchQuery.trim().length > 0) {
            const results = searchIndex(searchQuery);
            setSearchResults(results);
            setShowResults(true);
        } else {
            setSearchResults([]);
            setShowResults(false);
        }
    }, [searchQuery, searchIndex]);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (
                searchRef.current && !searchRef.current.contains(e.target as Node) &&
                mobileSearchRef.current && !mobileSearchRef.current.contains(e.target as Node)
            ) {
                setShowResults(false);
            }
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowResults(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            setShowResults(false);
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    const handleResultClick = (slug: string) => {
        setShowResults(false);
        setSearchQuery('');
        setSearchOpen(false);
        router.push(`/products/${slug}`);
    };

    const handleLogout = () => {
        logout();
        clearCart();
        clearWishlist();
        clearOrders();
        setMobileMenuOpen(false);
        router.push('/');
    };

    const getImageUrl = (url?: string | null) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';
        return `${baseUrl}${url}`;
    };

    const SearchResultsDropdown = ({ results, className }: { results: SearchIndexItem[]; className?: string }) => {
        if (results.length === 0 && searchQuery.trim().length > 1) {
            return (
                <div className={cn("absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-4 text-center", className)}>
                    <p className="text-sm text-muted-foreground">No products found for "{searchQuery}"</p>
                    <button
                        onClick={() => { setShowResults(false); router.push(`/search?q=${encodeURIComponent(searchQuery)}`); }}
                        className="text-sm text-primary font-medium mt-2 hover:underline"
                    >
                        Search all products →
                    </button>
                </div>
            );
        }
        if (results.length === 0) return null;
        return (
            <div className={cn("absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden", className)}>
                <div className="max-h-[360px] overflow-y-auto">
                    {results.map((item) => {
                        const imgUrl = getImageUrl(item.image);
                        const discount = item.mrp > item.selling_price
                            ? Math.round(((item.mrp - item.selling_price) / item.mrp) * 100)
                            : 0;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleResultClick(item.slug)}
                                className="flex items-center gap-3 w-full px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-b-0"
                            >
                                <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 border">
                                    {imgUrl ? (
                                        <Image src={imgUrl} alt={item.name} fill className="object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-slate-400">
                                            <Search className="h-4 w-4" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-sm font-bold text-primary">{formatPrice(item.selling_price)}</span>
                                        {discount > 0 && (
                                            <span className="text-xs text-slate-400 line-through">{formatPrice(item.mrp)}</span>
                                        )}
                                        {discount > 0 && (
                                            <span className="text-xs font-semibold text-green-600">{discount}% off</span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
                <button
                    onClick={() => { setShowResults(false); router.push(`/search?q=${encodeURIComponent(searchQuery)}`); }}
                    className="w-full px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/5 transition-colors border-t text-center"
                >
                    See all results for "{searchQuery}"
                </button>
            </div>
        );
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b border-pink-100/80 bg-white/90 shadow-[0_10px_30px_rgba(236,72,153,0.06)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/75">
            <div className="container flex h-[72px] items-center justify-between gap-3">
                {/* Logo */}
                <Link href="/" className="group flex items-center gap-2">
                    <div className="logo-glow flex items-center gap-2">
                        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-primary to-pink-500 text-sm font-black text-white shadow-lg shadow-pink-200 transition-transform group-hover:scale-105">
                            P
                        </span>
                        <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-pink-500 to-rose-400 bg-clip-text text-transparent">
                            Pranjay
                        </span>
                    </div>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-1 rounded-full border border-pink-100 bg-pink-50/40 p-1">
                    {/* Custom Products Link with Dropdown */}
                    <div className="relative group">
                        <Link
                            href="/products"
                            className={cn(
                                'flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-semibold transition-all hover:bg-white hover:text-primary hover:shadow-sm',
                                pathname.startsWith('/products')
                                    ? 'bg-white text-primary shadow-sm'
                                    : 'text-muted-foreground'
                            )}
                        >
                            Products
                            <ChevronDown className="h-4 w-4 transition-transform group-hover:rotate-180" />
                        </Link>
                        
                        {/* Dropdown Menu */}
                        <div className="absolute left-0 top-full hidden group-hover:block pt-0">
                            <div className="bg-white border border-pink-100 rounded-2xl shadow-2xl min-w-[220px] py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <Link 
                                    href="/products"
                                    className="block px-4 py-2.5 text-sm hover:bg-pink-50 hover:text-primary transition-colors font-semibold border-b border-pink-50"
                                >
                                    All Products
                                </Link>
                                <div className="max-h-[300px] overflow-y-auto">
                                    {categories.length > 0 ? (
                                        categories.map((category) => (
                                            <Link
                                                key={category.id}
                                                href={`/products?category=${category.id}`}
                                                className="block px-4 py-2 text-sm hover:bg-pink-50 hover:text-primary transition-colors"
                                            >
                                                {category.name}
                                            </Link>
                                        ))
                                    ) : (
                                        <div className="px-4 py-2 text-sm text-muted-foreground italic">
                                            Loading categories...
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                'rounded-full px-3.5 py-2 text-sm font-semibold transition-all hover:bg-white hover:text-primary hover:shadow-sm',
                                pathname === link.href
                                    ? 'bg-white text-primary shadow-sm'
                                    : 'text-muted-foreground'
                            )}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                {/* Search Bar (Desktop) */}
                <div ref={searchRef} className="hidden md:flex flex-1 max-w-xl mx-4 relative">
                    <form onSubmit={handleSearch} className="w-full">
                        <div className="relative w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                            <Input
                                type="search"
                                placeholder="Search lipstick, skincare, salon products..."
                                className="h-12 w-full rounded-full border-pink-100 bg-white pl-11 pr-4 text-[15px] shadow-inner shadow-pink-50 placeholder:text-slate-400 focus-visible:ring-primary/30"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => { if (searchQuery.trim()) setShowResults(true); }}
                            />
                        </div>
                    </form>
                    {showResults && <SearchResultsDropdown results={searchResults} />}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {/* Become a Seller / Login (Desktop only) */}
                    <div className="hidden md:flex items-center gap-2 mr-1">
                        {(!isAuthenticated || (user?.seller_status !== 'approved' && user?.role !== 'admin' && user?.role !== 'super_admin')) && (
                            <Link
                                href="/login?type=seller"
                                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-pink-500 px-4 py-2 text-sm font-bold text-white shadow-md shadow-pink-200 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                            >
                                <Sparkles className="h-3.5 w-3.5" />
                                Become a Seller
                            </Link>
                        )}
                        {!isAuthenticated ? (
                            <Link
                                href="/login"
                                className="rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-pink-50 hover:text-primary"
                            >
                                Login
                            </Link>
                        ) : (
                            <button
                                onClick={handleLogout}
                                className="rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-pink-50 hover:text-primary"
                            >
                                Logout
                            </button>
                        )}
                    </div>

                    {/* Mobile Search Toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full hover:bg-pink-50 md:hidden"
                        onClick={() => setSearchOpen(!searchOpen)}
                    >
                        <Search className="h-5 w-5" />
                    </Button>

                    {/* Wishlist */}
                    <Link href="/wishlist">
                        <Button variant="ghost" size="icon" className="relative rounded-full border border-transparent hover:border-pink-100 hover:bg-pink-50 hover:text-primary">
                            <Heart className="h-5 w-5" />
                            {wishlistCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-sm">
                                    {wishlistCount}
                                </span>
                            )}
                        </Button>
                    </Link>

                    {/* Cart */}
                    <Link href="/cart">
                        <Button variant="ghost" size="icon" className="relative rounded-full border border-transparent hover:border-pink-100 hover:bg-pink-50 hover:text-primary">
                            <ShoppingCart className="h-5 w-5" />
                            {cartItemCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-sm">
                                    {cartItemCount > 99 ? '99+' : cartItemCount}
                                </span>
                            )}
                        </Button>
                    </Link>

                    {/* Mobile Menu Toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full hover:bg-pink-50 md:hidden"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? (
                            <X className="h-5 w-5" />
                        ) : (
                            <Menu className="h-5 w-5" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Mobile Search */}
            {searchOpen && (
                <div ref={mobileSearchRef} className="md:hidden border-t border-pink-100 bg-white/95 p-4 relative">
                    <form onSubmit={handleSearch}>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                            <Input
                                type="search"
                                placeholder="Search cosmetics..."
                                className="h-11 w-full rounded-full border-pink-100 pl-11"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => { if (searchQuery.trim()) setShowResults(true); }}
                                autoFocus
                            />
                        </div>
                    </form>
                    {showResults && <SearchResultsDropdown results={searchResults} />}
                </div>
            )}

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t border-pink-100 bg-white/95">
                    <nav className="flex flex-col p-4 space-y-2 max-h-[70vh] overflow-y-auto overscroll-contain">
                        {/* Mobile Products with Categories */}
                        <div className="flex flex-col">
                            <button
                                onClick={() => setCategoriesOpen(!categoriesOpen)}
                                className={cn(
                                    'flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors',
                                    pathname.startsWith('/products')
                                        ? 'bg-primary/10 text-primary'
                                        : 'hover:bg-pink-50'
                                )}
                            >
                                Products
                                <ChevronDown className={cn("h-4 w-4 transition-transform", categoriesOpen && "rotate-180")} />
                            </button>
                            
                            {categoriesOpen && (
                                <div className="flex flex-col ml-4 mt-1 border-l border-pink-100 pl-2 space-y-1">
                                    <Link
                                        href="/products"
                                        className="px-4 py-2 rounded-lg text-sm hover:bg-pink-50 font-medium"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        All Products
                                    </Link>
                                    {categories.map((category) => (
                                        <Link
                                            key={category.id}
                                            href={`/products?category=${category.id}`}
                                            className="px-4 py-2 rounded-lg text-sm hover:bg-pink-50"
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            {category.name}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    'px-4 py-3 rounded-xl text-sm font-semibold transition-colors',
                                    pathname === link.href
                                        ? 'bg-primary/10 text-primary'
                                        : 'hover:bg-pink-50'
                                )}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {link.label}
                            </Link>
                        ))}

                        {/* Become a Seller — mobile */}
                        {(!isAuthenticated || (user?.seller_status !== 'approved' && user?.role !== 'admin' && user?.role !== 'super_admin')) && (
                            <Link
                                href="/login?type=seller"
                                className="rounded-xl bg-gradient-to-r from-primary to-pink-500 px-4 py-3 text-sm font-bold text-white shadow-md shadow-pink-100"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Become a Seller
                            </Link>
                        )}

                        {!isAuthenticated ? (
                            <Link
                                href="/login"
                                className="px-4 py-3 rounded-xl text-sm font-semibold transition-colors hover:bg-pink-50"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Login
                            </Link>
                        ) : (
                            <div className="flex flex-col">
                                <button
                                    onClick={handleLogout}
                                    className="px-4 py-3 rounded-xl text-sm font-semibold transition-colors hover:bg-pink-50 text-left"
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </nav>
                </div>
            )}
        </header>
    );
}
