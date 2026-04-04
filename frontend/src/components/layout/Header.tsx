'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingCart, Heart, Menu, Search, X, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';

import { categoriesApi, CategoryRead } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { useOrderStore } from '@/store/order-store';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';

export function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [categories, setCategories] = useState<CategoryRead[]>([]);
    const [categoriesOpen, setCategoriesOpen] = useState(false);
    
    const pathname = usePathname();
    const router = useRouter();

    const cartItemCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
    const wishlistCount = useWishlistStore((state) => state.items.length);
    const { isAuthenticated, user, logout } = useAuthStore();
    const clearCart = useCartStore((state) => state.clearCart);
    const clearWishlist = useWishlistStore((state) => state.clearWishlist);
    const clearOrders = useOrderStore((state) => state.clearOrders);

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
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    const handleLogout = () => {
        logout();
        clearCart();
        clearWishlist();
        clearOrders();
        setMobileMenuOpen(false);
        router.push('/');
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center">
                    <div className="relative h-14 w-56">
                        <Image
                            src="/logo.jpg"
                            alt="Pranjay Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center space-x-6">
                    {/* Custom Products Link with Dropdown */}
                    <div className="relative group">
                        <Link
                            href="/products"
                            className={cn(
                                'flex items-center gap-1 text-sm font-medium transition-colors hover:text-primary py-4',
                                pathname.startsWith('/products')
                                    ? 'text-primary'
                                    : 'text-muted-foreground'
                            )}
                        >
                            Products
                            <ChevronDown className="h-4 w-4 transition-transform group-hover:rotate-180" />
                        </Link>
                        
                        {/* Dropdown Menu */}
                        <div className="absolute left-0 top-full hidden group-hover:block pt-0">
                            <div className="bg-background border rounded-lg shadow-xl min-w-[200px] py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <Link 
                                    href="/products"
                                    className="block px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors font-medium border-b"
                                >
                                    All Products
                                </Link>
                                <div className="max-h-[300px] overflow-y-auto">
                                    {categories.length > 0 ? (
                                        categories.map((category) => (
                                            <Link
                                                key={category.id}
                                                href={`/products?category=${category.id}`}
                                                className="block px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
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
                                'text-sm font-medium transition-colors hover:text-primary',
                                pathname === link.href
                                    ? 'text-primary'
                                    : 'text-muted-foreground'
                            )}
                        >
                            {link.label}
                        </Link>
                    ))}
                    {!isAuthenticated ? (
                        <Link
                            href="/login"
                            className="text-sm font-medium transition-colors hover:text-primary text-muted-foreground"
                        >
                            Login
                        </Link>
                    ) : (
                        <div className="flex items-center space-x-6">
                            <button
                                onClick={handleLogout}
                                className="text-sm font-medium transition-colors hover:text-primary text-muted-foreground"
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </nav>

                {/* Search Bar (Desktop) */}
                <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-6">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search cosmetics..."
                            className="pl-10 w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </form>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                    {/* Mobile Search Toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setSearchOpen(!searchOpen)}
                    >
                        <Search className="h-5 w-5" />
                    </Button>

                    {/* Wishlist */}
                    <Link href="/wishlist">
                        <Button variant="ghost" size="icon" className="relative">
                            <Heart className="h-5 w-5" />
                            {wishlistCount > 0 && (
                                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                                    {wishlistCount}
                                </span>
                            )}
                        </Button>
                    </Link>

                    {/* Cart */}
                    <Link href="/cart">
                        <Button variant="ghost" size="icon" className="relative">
                            <ShoppingCart className="h-5 w-5" />
                            {cartItemCount > 0 && (
                                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                                    {cartItemCount > 99 ? '99+' : cartItemCount}
                                </span>
                            )}
                        </Button>
                    </Link>

                    {/* Mobile Menu Toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
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
                <div className="md:hidden border-t p-4">
                    <form onSubmit={handleSearch}>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search cosmetics..."
                                className="pl-10 w-full"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </form>
                </div>
            )}

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t">
                    <nav className="flex flex-col p-4 space-y-2">
                        {/* Mobile Products with Categories */}
                        <div className="flex flex-col">
                            <button
                                onClick={() => setCategoriesOpen(!categoriesOpen)}
                                className={cn(
                                    'flex items-center justify-between px-4 py-2 rounded-md text-sm font-medium transition-colors',
                                    pathname.startsWith('/products')
                                        ? 'bg-primary/10 text-primary'
                                        : 'hover:bg-muted'
                                )}
                            >
                                Products
                                <ChevronDown className={cn("h-4 w-4 transition-transform", categoriesOpen && "rotate-180")} />
                            </button>
                            
                            {categoriesOpen && (
                                <div className="flex flex-col ml-4 mt-1 border-l pl-2 space-y-1">
                                    <Link
                                        href="/products"
                                        className="px-4 py-2 rounded-md text-sm hover:bg-muted font-medium"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        All Products
                                    </Link>
                                    {categories.map((category) => (
                                        <Link
                                            key={category.id}
                                            href={`/products?category=${category.id}`}
                                            className="px-4 py-2 rounded-md text-sm hover:bg-muted"
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
                                    'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                                    pathname === link.href
                                        ? 'bg-primary/10 text-primary'
                                        : 'hover:bg-muted'
                                )}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {link.label}
                            </Link>
                        ))}

                        {!isAuthenticated ? (
                            <Link
                                href="/login"
                                className="px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-muted"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Login
                            </Link>
                        ) : (
                            <div className="flex flex-col">
                                <button
                                    onClick={handleLogout}
                                    className="px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-muted text-left"
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
